# Implementation Plan: Board Game Rental Pricing

Companion to [`trd-board-game-rental-pricing.md`](./trd-board-game-rental-pricing.md).

## Overview

Introduce a `RentalPricingScheme` entity owned 1:1 by a variant, with two pricing types (`tiered` and `flat`). At check-in, the scheme is snapshotted onto the rental row (`snapshot_pricing_type`, `snapshot_flat_price`, `snapshot_tiers_json`). At check-out, a `PricingCalculator` reads only from the snapshot.

The hardcoded `MAX_HOUR := 6.0` and `variant.Price × hours` math in `apps/api/domain/rental_usecase.go:107-128` is replaced.

**Design rules driving this plan:**
- One rental row = one person. Groups create N rows.
- One variant = one scheme. No join table. No `pricing_scheme_id` on rentals.
- Scheme has no name — variant name is the display name.
- Scheme is edited inside the variant form, not on a standalone page.

Phases are independently shippable: schema → domain → data → handler → contract → web → mobile → docs.

---

## Phase 1: Database Schema + Seeds

**Goal:** New tables exist; existing rentals + variants backfilled; nothing reads from them yet.

### 1.1 Migration `000004_rental_pricing_schemes`

`apps/api/migrations/000004_rental_pricing_schemes.up.sql`:

- `CREATE TABLE rental_pricing_schemes` (pricing_type, description, flat_price, created_at, deleted_at, CHECK constraint per TRD).
- `CREATE TABLE rental_pricing_scheme_tiers` (scheme_id, up_to_minutes, price_per_person, unique on `(scheme_id, up_to_minutes)`).
- `ALTER TABLE variants ADD COLUMN rental_pricing_scheme_id BIGINT NULL` + FK.
- `ALTER TABLE rentals ADD COLUMN snapshot_pricing_type ENUM('tiered','flat') NULL` (initially nullable for backfill), `snapshot_flat_price FLOAT NULL`, `snapshot_tiers_json JSON NULL`.
- Seed one "Hourly" scheme (`tiered`) + 7 tiers per TRD §FR-5.
- Seed one "All Day Weekday" scheme (`flat`, 50000) + one "All Day Weekend" scheme (`flat`, 60000).
- `UPDATE variants SET rental_pricing_scheme_id = <Hourly id> WHERE id IN (SELECT id FROM variants v JOIN products p ON v.product_id = p.id WHERE p.sale_type = 'rental')` — every existing rental variant gets Hourly.
- `UPDATE rentals SET snapshot_pricing_type='tiered', snapshot_tiers_json='[{"up_to_minutes":60,"price_per_person":15000},...]'` for all existing rows.
- `ALTER TABLE rentals MODIFY COLUMN snapshot_pricing_type ENUM('tiered','flat') NOT NULL`.

`apps/api/migrations/000004_rental_pricing_schemes.down.sql`: reverse in opposite order.

### 1.2 Verify

- `go test ./apps/api/...` — still passes (nothing references the new columns).
- Migrate up → seeds present → migrate down → migrate up (idempotency).

**Exit criteria:** Migrations apply and revert cleanly on a fresh DB and on a DB with existing rental data.

---

## Phase 2: Domain Layer (Go)

**Goal:** Entities, repository interfaces, and the calculator exist with unit tests. No handlers yet.

### 2.1 New entities

`apps/api/domain/rental_pricing_scheme_entity.go`:
```go
type PricingType string
const (
    PricingTypeTiered PricingType = "tiered"
    PricingTypeFlat   PricingType = "flat"
)

type RentalPricingSchemeTier struct {
    Id             int64
    SchemeId       int64
    UpToMinutes    int
    PricePerPerson float32
}

type RentalPricingScheme struct {
    Id          int64
    PricingType PricingType
    Description *string
    FlatPrice   *float32                    // only for flat
    Tiers       []RentalPricingSchemeTier   // only for tiered, sorted ASC by UpToMinutes
    CreatedAt   time.Time
    DeletedAt   *time.Time
}
```

### 2.2 Extend Variant and Rental entities

`apps/api/domain/variant_entity.go`: add `RentalPricingSchemeId *int64` and `RentalPricingScheme *RentalPricingScheme`.

`apps/api/domain/rental_entity.go`: add
```go
SnapshotPricingType PricingType
SnapshotFlatPrice   *float32
SnapshotTiersJSON   *string   // raw JSON; parsed by the calculator
```

### 2.3 Repository interface

`apps/api/domain/rental_pricing_scheme_repository.go`:
- `CreateScheme(ctx, scheme) (RentalPricingScheme, *Error)` — inserts scheme + tiers atomically.
- `UpdateScheme(ctx, scheme) (RentalPricingScheme, *Error)` — replaces tier rows; `pricing_type` is immutable.
- `DeleteSchemeById(ctx, id) *Error` — soft delete.
- `GetSchemeById(ctx, id) (RentalPricingScheme, *Error)` — includes tiers.

### 2.4 Pricing calculator

`apps/api/domain/rental_pricing_calculator.go` — pure function, no DB:

```go
type SnapshotPricing struct {
    Type      PricingType
    FlatPrice *float32
    Tiers     []RentalPricingSchemeTier  // already parsed, sorted ASC
}

type PricingResult struct {
    Price float32  // total for this one rental (one person)
}

func CalculatePrice(snap SnapshotPricing, duration time.Duration) (PricingResult, *Error)
```

**`tiered` branch:**
```
durationMinutes = int(math.Ceil(duration.Minutes()))
for tier in tiers (sorted ASC):
    if tier.UpToMinutes >= durationMinutes:
        return tier.PricePerPerson
return tiers[len-1].PricePerPerson   // exceeded all tiers → cap at last
```

**`flat` branch:** `return *snap.FlatPrice`.

**Helpers:** add `ParseSnapshotTiers(json string) ([]RentalPricingSchemeTier, *Error)` used by both the calculator and the API serializer.

### 2.5 Calculator tests

`apps/api/domain/rental_pricing_calculator_test.go` — table-driven, covering every TRD §FR-5 row:

| Case | Snapshot | Duration | Expected |
|---|---|---|---:|
| 2h tiered | seeded tiers | 120 min | 30,000 |
| 3h tiered | seeded tiers | 180 min | 45,000 (×2 rentals at handler level = 90K) |
| 1h15m tiered | seeded tiers | 75 min | 20,000 |
| 1h35m tiered | seeded tiers | 95 min | 30,000 |
| 7h tiered (over cap) | seeded tiers | 420 min | 90,000 |
| Weekday flat | flat 50K | irrelevant | 50,000 |
| Weekend flat | flat 60K | irrelevant | 60,000 |

Plus error cases: `tiered` type with empty tier list, `flat` type with nil `FlatPrice`, malformed JSON in `ParseSnapshotTiers`.

### 2.6 Scheme usecase

`apps/api/domain/rental_pricing_scheme_usecase.go` — CRUD with validation:
- `pricing_type` cannot change on update.
- `tiered`: at least one tier; `up_to_minutes` strictly ascending; all positive; `flat_price` must be nil.
- `flat`: `flat_price > 0`; `tiers` must be empty.

`apps/api/domain/rental_pricing_scheme_usecase_test.go` mirrors existing usecase test patterns (see `category_usecase_test.go`).

### 2.7 Verify

`go test ./apps/api/domain/...` all green.

**Exit criteria:** Domain layer complete and tested in isolation.

---

## Phase 3: Data Layer (MySQL)

**Goal:** Repository interfaces from Phase 2 have working GORM implementations.

### 3.1 GORM models

- `apps/api/data/mysql/rental_pricing_scheme_entity.go` — GORM struct + `rental_pricing_scheme_tier_entity.go`.
- `apps/api/data/mysql/rental_pricing_scheme_transformer.go` — domain ↔ data converters.
- Extend `apps/api/data/mysql/variant_entity.go`: add `RentalPricingSchemeId *int64` + `belongsTo` relation.
- Extend `apps/api/data/mysql/rental_entity.go`: add the three snapshot columns.

### 3.2 Repository implementation

`apps/api/data/mysql/rental_pricing_scheme_repo.go`:
- `Create` and `Update` are transactional (scheme row + tier rows replaced wholesale on update).
- `GetSchemeById` preloads tiers ordered by `up_to_minutes ASC`.
- Variant repo (`variant_repo.go`) is updated to preload `RentalPricingScheme` (with its tiers) on `GetVariantById` and on the list endpoints that already return variants.

### 3.3 Wire into DI

Update `apps/api/main.go` (or the wiring file used today) to:
- Construct `RentalPricingSchemeRepository`.
- Construct `RentalPricingSchemeUsecase` and pass to the new handler in Phase 4.
- Pass `RentalPricingSchemeRepository` into the **rental** usecase constructor — the rental usecase needs it at check-in time to read the variant's scheme.

### 3.4 Verify

Existing tests still pass. If the project has a MySQL test harness, add an integration test for `CreateScheme` + `GetSchemeById` round-trip.

**Exit criteria:** Repos work against MySQL; existing tests untouched.

---

## Phase 4: Modify Rental Usecase + Embed Scheme in Variant Handler

**Goal:** Check-in snapshots the scheme; check-out uses the calculator; variant create/update accepts an embedded scheme block.

### 4.1 Refactor `CheckinRentals`

In `apps/api/domain/rental_usecase.go`:
- Inject `VariantRepository` and `RentalPricingSchemeRepository` (the variant repo already exists).
- For each incoming rental:
  1. Load the variant.
  2. If variant's product is `rental`-type, require `variant.RentalPricingSchemeId` non-nil — reject `400` otherwise.
  3. Load the scheme (with tiers).
  4. Set `rental.SnapshotPricingType`, `rental.SnapshotFlatPrice`, `rental.SnapshotTiersJSON` (JSON-encode the tier slice).
- Insert as today.

### 4.2 Refactor `CheckoutRentals`

Replace `rental_usecase.go:107-128` with:
```go
var tiers []RentalPricingSchemeTier
if existingRental.SnapshotTiersJSON != nil {
    tiers, err = ParseSnapshotTiers(*existingRental.SnapshotTiersJSON)
    if err != nil { return err }
}
snap := SnapshotPricing{
    Type:      existingRental.SnapshotPricingType,
    FlatPrice: existingRental.SnapshotFlatPrice,
    Tiers:     tiers,
}
result, err := CalculatePrice(snap, checkoutAt.Sub(existingRental.CheckinAt))
```

Build `TransactionItem` with `Amount=1`, `Price=result.Price`, `Subtotal=result.Price`. Drop the `math` import + the `MAX_HOUR` constant + the `variantRepository.GetVariantById` call (no longer needed for math; keep only if needed for display name).

### 4.3 Update `rental_usecase_test.go`

New cases:
- Check-in of a rental-type variant with no scheme → 400.
- Check-in of a purchase-type variant → unaffected.
- Check-out for each of TRD §FR-5 rows 1, 3, 4, 5, 6, 8 (single-rental scenarios). Group scenarios (rows 2, 7) verified at handler-test level.

### 4.4 Extend variant handler with embedded scheme

In `apps/api/presentation/restapi/product_handler.go` (variants live under products) and the corresponding usecase:
- `POST /products/{id}/variants` request body adds optional `rental_pricing_scheme: { pricing_type, description, flat_price?, tiers? }`. Server creates scheme atomically with variant.
- `PUT /variants/{id}` accepts the same block. On update: if a scheme already exists, replace its fields/tiers (with `pricing_type` immutability check); else create one.
- `GET /variants/{id}` responses embed the scheme + tiers.

There is **no** standalone `/pricing-schemes` route — schemes are owned by variants.

### 4.5 Extend rental handler response

Edit `apps/api/presentation/restapi/rental_handler.go`:
- Rental list/get responses include the three snapshot fields.
- For ongoing rentals (`CheckoutAt == nil`), include a server-computed `running_total` via `CalculatePrice` against `time.Now()`.

### 4.6 Verify

`go test ./apps/api/...` all green. Manual `curl` smoke: create variant with a tiered scheme → check-in → fudge timestamps → check-out → verify the line item.

**Exit criteria:** Backend behavior matches every row of TRD §FR-5 end-to-end.

---

## Phase 5: API Contract Update + Codegen

**Goal:** TS clients reflect the new shapes.

### 5.1 Edit `libs/api-contract/src/api.yaml`

- New schemas: `RentalPricingScheme` (with `pricing_type`, `description`, `flat_price`, `tiers`), `RentalPricingSchemeTier`.
- `Variant` schema: add optional `rental_pricing_scheme_id` (read-only) and embedded `rental_pricing_scheme` object.
- `Variant` create/update request bodies: add optional `rental_pricing_scheme` block.
- `Rental` schema: add `snapshot_pricing_type`, `snapshot_flat_price`, `snapshot_tiers` (parsed array, not raw JSON, for FE convenience), `running_total` (read-only, present only when `checkout_at` is null).
- No path additions.

### 5.2 Codegen

Run the project's existing codegen script (check `libs/api-contract/package.json` and `openapitools.json`).

### 5.3 Verify

`nx build api-contract`, `nx build web`, `nx build mobile` all type-check.

**Exit criteria:** Generated TS types include the new shapes; both apps still compile.

---

## Phase 6: Web Frontend

**Goal:** Admin manages schemes from inside the variant form; staff sees subtotals at check-out.

### 6.1 Variant create/edit form

Edit `apps/web/src/pages/products/[productId]/variants/...`:
- Conditional section, visible only when the parent product's `sale_type === 'rental'`:
  - Radio: `Pricing Type` = `tiered | flat` (disabled on edit if a scheme already exists, per immutability rule).
  - If `tiered`: dynamic list of tier rows (`up_to_minutes` numeric, `price_per_person` numeric, Add/Remove buttons). Zod validates ascending minutes and positive prices.
  - If `flat`: single `flat_price` input.
- On submit, the form posts the embedded scheme block in the variant request.

### 6.2 Check-in screen

Edit `apps/web/src/pages/rentals/checkin.tsx`:
- **No new fields.** Picking the variant picks the pricing mode.
- For UX clarity, render a small badge next to the variant choice showing its pricing (e.g., "Tiered: 1h=15K, 1.5h=20K, ..." or "Flat: 50K"). Pull from the variant's embedded scheme.
- The form already supports adding multiple rental items (one per person) — confirm via Phase 6 manual test.

### 6.3 Rental list + check-out

Edit `apps/web/src/pages/rentals/index.tsx` and `apps/web/src/pages/rentals/checkout.tsx`:
- List view: show variant name, duration so far, and (for ongoing) `running_total`.
- Check-out confirmation: per rental, show `variant name • duration → subtotal`. Show grand total.

### 6.4 Verify

- `nx test web` passes — add component tests for the tier-editor's ascending-minutes validation.
- `nx serve web` + manual walkthrough:
  - Create a "Board Game — Hourly" variant with the seeded tiers → check in 1 person → wait/fudge to 1h15m → check out → expect **20,000**.
  - Same with 1h35m → expect **30,000**.
  - Create "Board Game — All Day Weekend" variant with `flat 60K` → check in 2 people (2 rental rows) → check out together → expect **120,000**.

**Exit criteria:** Every TRD §FR-5 row reproduces end-to-end in the web UI.

---

## Phase 7: Mobile Frontend

**Goal:** React Native parity for check-in and check-out. Scheme editing remains web-only for v1.

### 7.1 Mobile check-in / check-out

Update `apps/mobile/`:
- Check-in: same variant-picker UX + pricing badge.
- Check-out: same line breakdown.

Most form primitives are shared via `libs/ui`. Identify which screens already live there.

### 7.2 Verify

- `nx test mobile` passes.
- Walk the same 9 acceptance cases on a device/emulator.

**Exit criteria:** Mobile staff can check in (1 row per person) and see correct totals at check-out.

---

## Phase 8: Documentation + Release

1. Update `README.md` if it lists features.
2. Add a short "How to add or change a pricing scheme" guide for the cafe owner under `docs/`.
3. Update `E2E_TEST_PLAN.md` with the new scenarios.
4. PR description links to the TRD and lists every TRD §FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfill of historical rentals miscomputes snapshots | Low | Medium | All existing rentals snapshot the seeded "Hourly" tiers exactly; SQL diff before/after |
| Admin edits a scheme and is surprised that ongoing rentals don't change | Medium | Low | Surface explicitly in the variant edit form: "Existing rentals keep the original pricing; only future check-ins use the new tiers" |
| Forgetting to attach a scheme to a new rental-type variant blocks check-in | Medium | High | Server validates at variant create/update; FE form requires scheme block when product is `rental`-type |
| `pricing_type` immutability surprises admin | Low | Low | Disable the radio on edit + tooltip: "To change pricing type, create a new variant" |
| JSON snapshot drift between FE parsing and Go encoding | Low | Medium | Both sides go through the OpenAPI-generated `RentalPricingSchemeTier[]` array, not raw JSON; server hides the raw `snapshot_tiers_json` column and exposes `snapshot_tiers` array in the response |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 | 0.5 day | 2 |
| 2 | 1.5 days | 3, 4 |
| 3 | 1 day | 4 |
| 4 | 1.5 days | 5 |
| 5 | 0.5 day | 6, 7 |
| 6 | 2 days | 8 |
| 7 | 1 day | 8 |
| 8 | 0.5 day | — |

**Total:** ~8.5 working days, single engineer.
