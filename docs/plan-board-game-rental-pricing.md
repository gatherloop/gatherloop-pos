# Implementation Plan: Board Game Rental Pricing

Companion to [`trd-board-game-rental-pricing.md`](./trd-board-game-rental-pricing.md).

## Overview

Introduce a `PricingScheme` entity owned 1:1 by **rental variants only**. A scheme is just a list of `(up_to_minutes, price_per_person)` tiers — there is no `flat` vs `tiered` discriminator. "All Day" is a single-tier scheme; "Hourly" is a multi-tier scheme. At check-in, the variant's tier list is JSON-snapshotted onto the rental row. At check-out, a `PricingCalculator` reads only from the snapshot.

`variants.price` is **untouched** — purchase variants continue to use it exactly as today.

The hardcoded `MAX_HOUR := 6.0` and `variant.Price × hours` math in `apps/api/domain/rental_usecase.go:107-128` is replaced.

**Design rules driving this plan:**
- One rental row = one person. Groups create N rows.
- Schemes are rental-only. Purchase variants keep `variants.price`.
- Single pricing model: tiers. A 1-row table is the degenerate "flat" case.
- Scheme is edited inside the rental variant form, not on a standalone page.
- Scheme has no name — variant name is the display name.

This is **additive** for the variants API (no breaking change to existing purchase fields). Phases are independently shippable: schema → domain → data → handler → contract → web → mobile → docs.

---

## Phase 1: Database Schema + Seeds

**Goal:** New tables exist; existing rental variants point at a seeded "Hourly" scheme; existing rentals carry a snapshot. Purchase variants untouched.

### 1.1 Migration `000004_pricing_schemes`

`apps/api/migrations/000004_pricing_schemes.up.sql`:

1. `CREATE TABLE pricing_schemes (id, description, created_at, deleted_at)`.
2. `CREATE TABLE pricing_scheme_tiers (id, scheme_id, up_to_minutes, price_per_person, created_at, UNIQUE(scheme_id, up_to_minutes))`.
3. `ALTER TABLE variants ADD COLUMN pricing_scheme_id BIGINT NULL` + FK to `pricing_schemes(id)`. `variants.price` is **untouched**.
4. `ALTER TABLE rentals ADD COLUMN snapshot_tiers_json JSON NULL` (nullable for backfill).
5. **Seed three schemes** (insert + their tier rows):
   - "Hourly board game" → 7 tiers `{60→15K, 90→20K, 120→30K, 180→45K, 240→60K, 300→75K, 360→90K}`.
   - "All day weekday" → 1 tier `{840→50K}`.
   - "All day weekend" → 1 tier `{840→60K}`.
6. **Attach Hourly to every existing rental variant:**
   ```sql
   UPDATE variants v
   JOIN products p ON p.id = v.product_id
   SET v.pricing_scheme_id = <hourly_scheme_id>
   WHERE p.sale_type = 'rental';
   ```
7. **Backfill snapshots for existing rentals** with the Hourly tier list as JSON:
   ```sql
   UPDATE rentals
   SET snapshot_tiers_json = '[{"up_to_minutes":60,"price_per_person":15000},{"up_to_minutes":90,"price_per_person":20000},{"up_to_minutes":120,"price_per_person":30000},{"up_to_minutes":180,"price_per_person":45000},{"up_to_minutes":240,"price_per_person":60000},{"up_to_minutes":300,"price_per_person":75000},{"up_to_minutes":360,"price_per_person":90000}]';
   ```
8. `ALTER TABLE rentals MODIFY COLUMN snapshot_tiers_json JSON NOT NULL`.

`apps/api/migrations/000004_pricing_schemes.down.sql`: reverse strictly — drop snapshot column, drop scheme FK, drop tier rows, drop scheme rows, drop tables. (`variants.price` was never touched, so no restore needed.)

### 1.2 Verify

- `go test ./apps/api/...` — still passes; no existing code references the new columns.
- Migrate up → seeds present → migrate down → migrate up (idempotency).
- `SELECT pricing_scheme_id FROM variants v JOIN products p ON p.id = v.product_id WHERE p.sale_type='rental'` — every rental variant has a scheme. `WHERE p.sale_type='purchase'` — every purchase variant has `NULL`.
- `SELECT snapshot_tiers_json FROM rentals LIMIT 5` — populated with the Hourly tier JSON.

**Exit criteria:** Migrations apply and revert cleanly. Purchase variants are observably untouched by `SELECT price FROM variants WHERE …`.

---

## Phase 2: Domain Layer (Go)

**Goal:** Entities, repositories, and the calculator exist with unit tests. No handlers wired up yet.

### 2.1 New entities

`apps/api/domain/pricing_scheme_entity.go`:
```go
type PricingSchemeTier struct {
    Id             int64
    SchemeId       int64
    UpToMinutes    int
    PricePerPerson float32
}

type PricingScheme struct {
    Id          int64
    Description *string
    Tiers       []PricingSchemeTier   // sorted ASC by UpToMinutes, always >=1
    CreatedAt   time.Time
    DeletedAt   *time.Time
}
```

No `PricingType` enum, no `FlatPrice` field.

### 2.2 Extend Variant entity

`apps/api/domain/variant_entity.go`:
- **Keep** `Price float32` exactly as it is.
- **Add** `PricingSchemeId *int64` and `PricingScheme *PricingScheme` (nullable — only set for rental variants).

No need to audit existing `variant.Price` references — they continue to work for purchase variants.

### 2.3 Extend Rental entity

`apps/api/domain/rental_entity.go`: add
```go
SnapshotTiersJSON string   // raw JSON; parsed by the calculator
```

One column, not three.

### 2.4 Repository interface

`apps/api/domain/pricing_scheme_repository.go`:
- `CreateScheme(ctx, scheme) (PricingScheme, *Error)` — inserts scheme + tiers atomically.
- `UpdateScheme(ctx, scheme) (PricingScheme, *Error)` — replaces tier rows wholesale.
- `DeleteSchemeById(ctx, id) *Error` — soft delete.
- `GetSchemeById(ctx, id) (PricingScheme, *Error)` — includes tiers, sorted ASC.

### 2.5 Pricing calculator

`apps/api/domain/pricing_calculator.go` — pure function, no DB, single branch:

```go
type SnapshotPricing struct {
    Tiers []PricingSchemeTier   // already parsed, sorted ASC, len >= 1
}

type PricingResult struct {
    Price float32   // total for this one rental (one person)
}

func CalculatePrice(snap SnapshotPricing, duration time.Duration) (PricingResult, *Error) {
    if len(snap.Tiers) == 0 {
        return PricingResult{}, &Error{Type: BadRequest, Message: "snapshot has no tiers"}
    }
    durationMinutes := int(math.Ceil(duration.Minutes()))
    for _, tier := range snap.Tiers {
        if tier.UpToMinutes >= durationMinutes {
            return PricingResult{Price: tier.PricePerPerson}, nil
        }
    }
    return PricingResult{Price: snap.Tiers[len(snap.Tiers)-1].PricePerPerson}, nil   // cap
}
```

Helper: `ParseSnapshotTiers(json string) ([]PricingSchemeTier, *Error)`.

### 2.6 Calculator tests

`apps/api/domain/pricing_calculator_test.go` — table-driven, covering every TRD §FR-5 row 1-8. Plus:
- Empty tier list → error.
- Duration exactly equal to a tier boundary (e.g., 60min against the 60-tier) → uses that tier.
- Duration above the largest tier → returns the cap.
- `ParseSnapshotTiers` malformed input → error.
- `ParseSnapshotTiers` tiers out of order → error (defensive: snapshots should always be ASC, but verify the parse path).

### 2.7 Scheme usecase

`apps/api/domain/pricing_scheme_usecase.go` — CRUD with validation:
- `tiers` non-empty.
- `up_to_minutes` strictly ascending and `> 0`.
- `price_per_person >= 0`.

`apps/api/domain/pricing_scheme_usecase_test.go` mirrors existing usecase test patterns (see `category_usecase_test.go`).

### 2.8 Variant usecase validation

Update `apps/api/domain/variant_usecase.go` (create + update paths):
- When the parent product `SaleType == 'rental'`: require `PricingSchemeId != nil` (and the embedded scheme has ≥1 valid tier). Reject `400` otherwise.
- When `SaleType == 'purchase'`: require `PricingSchemeId == nil`. Reject `400` if set.

### 2.9 Verify

`go test ./apps/api/domain/...` all green.

**Exit criteria:** Domain layer complete and tested in isolation. No handlers, no SQL.

---

## Phase 3: Data Layer (MySQL)

**Goal:** Repositories from Phase 2 have working GORM implementations.

### 3.1 GORM models

- `apps/api/data/mysql/pricing_scheme_entity.go` — GORM struct.
- `apps/api/data/mysql/pricing_scheme_tier_entity.go` — GORM struct.
- `apps/api/data/mysql/pricing_scheme_transformer.go` — domain ↔ data converters.
- Extend `apps/api/data/mysql/variant_entity.go`: add `PricingSchemeId *int64` and `belongsTo` relation.
- Extend `apps/api/data/mysql/rental_entity.go`: add `SnapshotTiersJSON string`.

### 3.2 Repository implementation

`apps/api/data/mysql/pricing_scheme_repo.go`:
- `Create` and `Update` are transactional (scheme row + tier rows replaced wholesale on update).
- `GetSchemeById` preloads tiers ordered by `up_to_minutes ASC`.
- Variant repo (`variant_repo.go`) preloads `PricingScheme` (with its tiers) on `GetVariantById` and on any list endpoint already returning embedded variants.

### 3.3 Wire into DI

Update `apps/api/main.go`:
- Construct `PricingSchemeRepository`.
- Construct `PricingSchemeUsecase`.
- Pass `PricingSchemeRepository` into the **rental** usecase constructor — it needs the scheme at check-in time.

### 3.4 Verify

Existing tests still pass. If the project has a MySQL test harness, add a `CreateScheme` + `GetSchemeById` round-trip test asserting tier ordering.

**Exit criteria:** Repos work against MySQL; existing tests untouched.

---

## Phase 4: Modify Rental Usecase + Embed Scheme in Variant Handler

**Goal:** Check-in snapshots the scheme; check-out uses the calculator; variant create/update accepts an embedded scheme block for rental variants.

### 4.1 Refactor `CheckinRentals`

In `apps/api/domain/rental_usecase.go`:
- Inject `VariantRepository` (already exists).
- For each incoming rental:
  1. Load the variant (with its preloaded scheme + tiers).
  2. If the variant's product is `rental` and `variant.PricingSchemeId` is nil → reject `400`.
  3. JSON-encode `variant.PricingScheme.Tiers` into `rental.SnapshotTiersJSON`.
- Insert as today.

### 4.2 Refactor `CheckoutRentals`

Replace lines 107-128 of `rental_usecase.go` with:
```go
tiers, parseErr := ParseSnapshotTiers(existingRental.SnapshotTiersJSON)
if parseErr != nil { return parseErr }
result, err := CalculatePrice(SnapshotPricing{Tiers: tiers}, checkoutAt.Sub(existingRental.CheckinAt))
if err != nil { return err }
```

Build `TransactionItem` with `Amount=1`, `Price=result.Price`, `Subtotal=result.Price`. Drop the `math` import + the `MAX_HOUR` constant + the now-unused `variantRepository.GetVariantById` call (keep only if needed for display name).

### 4.3 Update `rental_usecase_test.go`

New cases:
- Check-in of a rental-type variant with no scheme → 400.
- Check-in of a purchase-type variant → unaffected (still uses existing flow).
- Check-out reproducing TRD §FR-5 rows 1, 3, 4, 5, 6, 8. Group scenarios (rows 2, 7) covered at handler-test level.

### 4.4 Extend variant handler with embedded scheme

In `apps/api/presentation/restapi/product_handler.go` (variants live under products) and the variant usecase:
- `POST /products/{id}/variants` request body adds optional `pricing_scheme: { description?, tiers: [{up_to_minutes, price_per_person}, ...] }`. Required when product is `rental`-type; forbidden when `purchase`.
- `PUT /variants/{id}` accepts the same block. On update: if a scheme already exists, replace its tier rows; else create one.
- `GET /variants/{id}` responses embed `pricing_scheme` + tiers (null for purchase variants).

There is **no** standalone `/pricing-schemes` route.

### 4.5 Extend rental handler response

Edit `apps/api/presentation/restapi/rental_handler.go`:
- Rental list/get responses include `snapshot_tiers` (parsed array, not raw JSON, for FE convenience).
- For ongoing rentals (`CheckoutAt == nil`), include a server-computed `running_total` via `CalculatePrice` against `time.Now()`.

### 4.6 Verify

`go test ./apps/api/...` all green. Manual `curl` smoke:
1. Create a rental variant with the 7-tier Hourly scheme.
2. Check in.
3. Fudge timestamps; check out.
4. Verify the line item amount matches the expected tier.

**Exit criteria:** Backend behavior matches every TRD §FR-5 row end-to-end.

---

## Phase 5: API Contract Update + Codegen

**Goal:** TS clients reflect the new shapes.

### 5.1 Edit `libs/api-contract/src/api.yaml`

- New schemas: `PricingScheme { id, description?, tiers[] }`, `PricingSchemeTier { up_to_minutes, price_per_person }`.
- `Variant` schema: add optional `pricing_scheme_id` (read-only) and embedded `pricing_scheme` object (null for purchase). `price` field unchanged.
- `Variant` create/update request bodies: add optional `pricing_scheme` block.
- `Rental` schema: add `snapshot_tiers` (parsed array) and `running_total` (read-only, present when `checkout_at` is null).
- No path additions.

### 5.2 Codegen

Run the project's existing codegen script (check `libs/api-contract/package.json` and `openapitools.json`).

### 5.3 Verify

`nx build api-contract`, `nx build web`, `nx build mobile` all type-check.

**Exit criteria:** Generated TS types include the new shapes; both apps still compile (purchase flow untouched).

---

## Phase 6: Web Frontend

**Goal:** Admin manages tier tables inside the rental variant form; staff sees subtotals at check-out.

### 6.1 Variant create/edit form

Edit `apps/web/src/pages/products/[productId]/variants/...`:
- Conditional section visible only when the parent product's `sale_type === 'rental'`:
  - **Pricing Tiers** editor: dynamic list of `(up_to_minutes, price_per_person)` rows with Add/Remove. Zod validates ≥1 row, strictly ascending minutes, positive prices.
  - Help text: *"A single tier behaves like a flat rate. e.g., 'All Day' = one tier at 840 minutes."*
- Purchase variants keep the existing simple `price` input — no change.
- On submit, the form posts the embedded `pricing_scheme` block for rental variants.

### 6.2 Check-in screen

Edit `apps/web/src/pages/rentals/checkin.tsx`:
- **No new fields.** Picking the variant picks the tier list.
- Render a small badge under the variant picker showing the tier list (e.g., "60min: 15K, 90min: 20K, …, cap: 90K" or "Flat: 50K up to 840min").
- The existing form already supports adding multiple rental items for groups.

### 6.3 Rental list + check-out

Edit `apps/web/src/pages/rentals/index.tsx` and `apps/web/src/pages/rentals/checkout.tsx`:
- List view: show variant name, duration so far, and (for ongoing) `running_total`.
- Check-out confirmation: per rental, show `variant name • duration → subtotal`. Show grand total.

### 6.4 Verify

- `nx test web` passes — add component tests for the tier-editor's ascending-minutes validation.
- `nx serve web` + manual walkthrough:
  - Create "Board Game — Hourly" rental variant with the 7-tier scheme → check in 1 person → fudge timestamps to 1h15m → check out → expect **20,000**.
  - Same at 1h35m → expect **30,000**.
  - Create "Board Game — All Day Weekend" rental variant with `{840→60K}` → check in 2 people (2 rental rows) → check out together → expect **120,000**.
  - Create a purchase variant — confirm the form still shows the simple `price` input and no tier editor.

**Exit criteria:** Every TRD §FR-5 row reproduces end-to-end in the web UI; purchase flow visibly unchanged.

---

## Phase 7: Mobile Frontend

**Goal:** React Native parity for check-in and check-out. Scheme editing remains web-only for v1.

### 7.1 Mobile check-in / check-out

Update `apps/mobile/`:
- Check-in: same variant picker + pricing badge.
- Check-out: same line breakdown.

Most form primitives are shared via `libs/ui`. Identify which screens already live there.

### 7.2 Verify

- `nx test mobile` passes.
- Walk the same acceptance cases on a device/emulator.

**Exit criteria:** Mobile staff can check in (1 row per person) and see correct totals at check-out.

---

## Phase 8: Documentation + Release

1. Update `README.md` if it lists features.
2. Add a short "How to add or change a rental pricing scheme" guide for the cafe owner under `docs/`.
3. Update `E2E_TEST_PLAN.md` with the new scenarios.
4. PR description links to the TRD and lists every TRD §FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfilling rental snapshots with the new 7-tier table doesn't exactly replay the old `price × hours, 6h cap` rule | Medium | Low | The seeded Hourly tiers are the new normal; document any drift in PR description. Only affects in-flight rentals that span the migration |
| Admin edits a scheme and is surprised that ongoing rentals don't reflect the change | Medium | Low | Surface explicitly in the variant edit form: "Existing rentals keep the original pricing; only future check-ins use the new tiers" |
| Forgetting to attach a scheme to a new rental variant blocks check-in | Medium | High | Variant usecase validation rejects rental variants without a scheme; FE form requires the tier editor for rental variants |
| Purchase variants accidentally gain a scheme via API misuse | Low | Low | Variant usecase validation rejects scheme on purchase variants |
| JSON snapshot drift between FE parsing and Go encoding | Low | Medium | Both sides go through OpenAPI-generated `PricingSchemeTier[]` arrays, not raw JSON; server hides the raw `snapshot_tiers_json` column and exposes `snapshot_tiers` as an array in responses |

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
