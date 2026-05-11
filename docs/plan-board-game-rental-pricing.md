# Implementation Plan: Board Game Rental Pricing

Companion to [`trd-board-game-rental-pricing.md`](./trd-board-game-rental-pricing.md).

## Overview

Introduce a single `PricingScheme` entity owned 1:1 by **every** variant (purchase + rental), with two pricing types: `flat` and `tiered`. Drop `variants.price` entirely. At check-in, the rental variant's scheme is snapshotted onto the rental row. At check-out, a `PricingCalculator` reads only from the snapshot. Purchase transactions read `variant.pricing_scheme.flat_price` directly (no separate snapshot — `transaction_items.price` already records the historical per-unit price).

The hardcoded `MAX_HOUR := 6.0` and `variant.Price × hours` math in `apps/api/domain/rental_usecase.go:107-128` is replaced.

**Design rules driving this plan:**
- One rental row = one person.
- Every variant has exactly one `pricing_scheme_id` (no `variants.price`).
- Purchase variants must be `flat`; rental variants can be `flat` or `tiered`.
- Scheme is edited inside the variant form, not on a standalone page.
- Scheme has no name — variant name is the display name.

This is a **breaking change** for any external consumer of the variants API (the `price` field disappears).

Phases are independently shippable: schema → domain → data → handler → contract → web → mobile → docs.

---

## Phase 1: Database Schema + Backfill

**Goal:** New tables exist; every variant has a scheme; rentals have snapshot columns; `variants.price` is gone. Nothing reads from the new columns yet (the old `variants.price` reads are migrated in Phase 4 — until then, the data layer keeps a derived getter that returns `pricing_scheme.flat_price`).

### 1.1 Migration `000004_pricing_schemes`

`apps/api/migrations/000004_pricing_schemes.up.sql`:

1. `CREATE TABLE pricing_schemes (id, pricing_type ENUM('tiered','flat'), description, flat_price, created_at, deleted_at)` with the CHECK constraint per TRD.
2. `CREATE TABLE pricing_scheme_tiers (id, scheme_id, up_to_minutes, price_per_person, created_at, UNIQUE(scheme_id, up_to_minutes))`.
3. `ALTER TABLE variants ADD COLUMN pricing_scheme_id BIGINT NULL` (nullable for backfill).
4. **Backfill schemes for every variant**:
   ```sql
   INSERT INTO pricing_schemes (pricing_type, flat_price, created_at)
     SELECT 'flat', price, NOW() FROM variants ORDER BY id;
   -- Map back via insertion order. Safest: a temp table + JOIN on row_number.
   ```
   Then `UPDATE variants v JOIN <mapping> m ON m.variant_id = v.id SET v.pricing_scheme_id = m.scheme_id`.
5. **Insert seeded "Hourly" tiered scheme** (not auto-attached to any variant — admin attaches it manually post-migration):
   ```sql
   INSERT INTO pricing_schemes (pricing_type, description) VALUES ('tiered', 'Hourly board game rate');
   -- Then 7 tier rows: 60→15K, 90→20K, 120→30K, 180→45K, 240→60K, 300→75K, 360→90K
   ```
6. `ALTER TABLE variants MODIFY COLUMN pricing_scheme_id BIGINT NOT NULL, ADD CONSTRAINT fk_variants_scheme ..., DROP COLUMN price`.
7. `ALTER TABLE rentals ADD COLUMN snapshot_pricing_type ENUM('tiered','flat') NULL, ADD COLUMN snapshot_flat_price FLOAT NULL, ADD COLUMN snapshot_tiers_json JSON NULL`.
8. **Backfill snapshots for existing rentals** (Open Question 1 in TRD — default to option A):
   ```sql
   UPDATE rentals r JOIN variants v ON v.id = r.variant_id JOIN pricing_schemes s ON s.id = v.pricing_scheme_id
     SET r.snapshot_pricing_type = 'flat', r.snapshot_flat_price = s.flat_price;
   ```
9. `ALTER TABLE rentals MODIFY COLUMN snapshot_pricing_type ENUM('tiered','flat') NOT NULL`.

`apps/api/migrations/000004_pricing_schemes.down.sql`: reverse strictly:
- Add back `variants.price FLOAT NOT NULL DEFAULT 0`.
- `UPDATE variants v JOIN pricing_schemes s ON s.id = v.pricing_scheme_id SET v.price = COALESCE(s.flat_price, 0)`.
- Drop snapshot columns from `rentals`.
- Drop `pricing_scheme_id` from `variants`.
- Drop `pricing_scheme_tiers` then `pricing_schemes`.

### 1.2 Verify

- `go test ./apps/api/...` — should still pass; existing code reads `variants.price` so until Phase 4 lands, the data layer must expose a virtual `Price` getter that returns `pricing_scheme.flat_price`. This compatibility shim is added in Phase 3.
- Migrate up → seeds present → migrate down → migrate up (idempotency).

**Exit criteria:** Migrations apply and revert cleanly on a fresh DB and on a DB with existing variants + rentals.

---

## Phase 2: Domain Layer (Go)

### 2.1 New entities

`apps/api/domain/pricing_scheme_entity.go`:
```go
type PricingType string
const (
    PricingTypeTiered PricingType = "tiered"
    PricingTypeFlat   PricingType = "flat"
)

type PricingSchemeTier struct {
    Id             int64
    SchemeId       int64
    UpToMinutes    int
    PricePerPerson float32
}

type PricingScheme struct {
    Id          int64
    PricingType PricingType
    Description *string
    FlatPrice   *float32                 // only for flat
    Tiers       []PricingSchemeTier      // only for tiered, sorted ASC
    CreatedAt   time.Time
    DeletedAt   *time.Time
}
```

### 2.2 Modify Variant entity

`apps/api/domain/variant_entity.go`:
- **Remove** `Price float32`.
- **Add** `PricingSchemeId int64` and `PricingScheme PricingScheme`.

Audit every reference to `variant.Price` in the domain layer; replace with `variant.PricingScheme.FlatPrice` (deref guard since it's nullable in transit, but always non-nil for `flat` schemes per FR-2 validation). Files to touch: `transaction_usecase.go`, `material_usecase.go` (if any), `calculation_usecase.go`, etc. — exhaustive grep before commit.

### 2.3 Extend Rental entity

`apps/api/domain/rental_entity.go`: add
```go
SnapshotPricingType PricingType
SnapshotFlatPrice   *float32
SnapshotTiersJSON   *string
```

### 2.4 Repository interface

`apps/api/domain/pricing_scheme_repository.go`:
- `CreateScheme(ctx, scheme) (PricingScheme, *Error)` — inserts scheme + tiers atomically.
- `UpdateScheme(ctx, scheme) (PricingScheme, *Error)` — replaces tier rows; `pricing_type` is immutable.
- `DeleteSchemeById(ctx, id) *Error` — soft delete.
- `GetSchemeById(ctx, id) (PricingScheme, *Error)` — includes tiers.

### 2.5 Pricing calculator

`apps/api/domain/pricing_calculator.go` — pure function, no DB:
```go
type SnapshotPricing struct {
    Type      PricingType
    FlatPrice *float32
    Tiers     []PricingSchemeTier   // already parsed, sorted ASC
}

type PricingResult struct {
    Price float32   // total for this one rental (one person)
}

func CalculatePrice(snap SnapshotPricing, duration time.Duration) (PricingResult, *Error)
```

**`tiered`:**
```
durationMinutes = int(math.Ceil(duration.Minutes()))
for tier in tiers ASC:
    if tier.UpToMinutes >= durationMinutes: return tier.PricePerPerson
return tiers[len-1].PricePerPerson  // exceeded all → cap at last
```
**`flat`:** `return *snap.FlatPrice`.

Helper: `ParseSnapshotTiers(json string) ([]PricingSchemeTier, *Error)`.

### 2.6 Calculator tests

`apps/api/domain/pricing_calculator_test.go` — table-driven, covering every TRD §FR-6 row 1-8. Plus:
- `tiered` with empty tier list → error.
- `flat` with nil `FlatPrice` → error.
- `ParseSnapshotTiers` malformed input → error.
- `tiered` with duration exactly equal to a tier boundary → uses that tier.

### 2.7 Scheme usecase

`apps/api/domain/pricing_scheme_usecase.go` — CRUD with validation:
- `pricing_type` cannot change on update.
- `tiered`: at least one tier; `up_to_minutes` strictly ascending; all positive; `flat_price` must be nil.
- `flat`: `flat_price > 0`; `tiers` must be empty.
- **Caller layer is responsible for the purchase=flat rule** (the variant usecase enforces it before calling the scheme usecase, since the scheme entity itself has no `sale_type` context).

`pricing_scheme_usecase_test.go` mirrors existing usecase test patterns.

### 2.8 Verify

`go test ./apps/api/domain/...` all green.

**Exit criteria:** Domain layer complete and tested in isolation.

---

## Phase 3: Data Layer (MySQL)

### 3.1 GORM models

- `apps/api/data/mysql/pricing_scheme_entity.go` + `pricing_scheme_tier_entity.go`.
- `apps/api/data/mysql/pricing_scheme_transformer.go`.
- `apps/api/data/mysql/variant_entity.go`: drop `Price`, add `PricingSchemeId int64` and `PricingScheme` relation.
- `apps/api/data/mysql/rental_entity.go`: add the three snapshot columns.

### 3.2 Repository implementation

`apps/api/data/mysql/pricing_scheme_repo.go`:
- `Create`/`Update` are transactional (scheme row + tier rows replaced wholesale on update).
- `GetSchemeById` preloads tiers ordered ASC.
- Update `variant_repo.go` to **always preload** `PricingScheme` (with tiers) on every read — single-row, list, and association loads. Same for `transaction_repo.go` where it returns variants.

### 3.3 Wire into DI

Update `apps/api/main.go`:
- Construct `PricingSchemeRepository`.
- Construct `PricingSchemeUsecase`, inject into the variant usecase (so it can enforce purchase=flat and create schemes atomically with variants).
- Inject `PricingSchemeRepository` into the rental usecase (needed at check-in to read the variant's scheme into the snapshot).

### 3.4 Verify

Existing tests still pass — every `variants.price` read should now be a `variant.PricingScheme.FlatPrice` deref. If any test references `Price`, fix it here.

**Exit criteria:** Repos work against MySQL; existing tests untouched on behavior.

---

## Phase 4: Modify Rental Usecase + Embed Scheme in Variant Handler

### 4.1 Refactor `CheckinRentals`

In `apps/api/domain/rental_usecase.go`:
- For each rental: load variant → read embedded `PricingScheme` → set `SnapshotPricingType`, `SnapshotFlatPrice`, `SnapshotTiersJSON` (JSON-encode the tier slice).
- No need for a separate scheme repo call if variant is already preloaded with scheme — confirm preload is configured (Phase 3.2).

### 4.2 Refactor `CheckoutRentals`

Replace `rental_usecase.go:107-128` with:
```go
var tiers []PricingSchemeTier
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
TransactionItem: `Amount=1, Price=result.Price, Subtotal=result.Price`. Drop `math` import + `MAX_HOUR` + the now-unused variant fetch (already done as part of check-in snapshot).

### 4.3 Update `rental_usecase_test.go`

Cover TRD §FR-6 rows 1, 3, 4, 5, 6, 8 single-rental scenarios. Group scenarios (rows 2, 7) verified at handler-test level.

### 4.4 Extend variant handler with embedded scheme

In `apps/api/presentation/restapi/product_handler.go` (variants are nested under products) and `variant_usecase.go`:
- `POST /products/{id}/variants` request body **requires** `pricing_scheme: { pricing_type, description?, flat_price?, tiers? }`. **Removes `price` field.** Server validates: if product is `purchase`-type, `pricing_type` must be `flat`. Then creates scheme atomically with variant.
- `PUT /variants/{id}` accepts the same block. On update: replace fields/tiers (with `pricing_type` immutability check).
- `GET /variants/{id}` responses embed the scheme + tiers. **No `price` field.**

There is **no** standalone `/pricing-schemes` route.

### 4.5 Update transaction handler

`apps/api/presentation/restapi/transaction_handler.go` and its usecase: replace any read of `variant.Price` with `variant.PricingScheme.FlatPrice` (purchase variants are always `flat` per validation, so this is safe to deref).

### 4.6 Extend rental handler response

`apps/api/presentation/restapi/rental_handler.go`:
- Rental list/get responses include the three snapshot fields.
- For ongoing rentals (`CheckoutAt == nil`), include a server-computed `running_total` via `CalculatePrice` against `time.Now()`.

### 4.7 Verify

`go test ./apps/api/...` all green. Manual `curl` smoke:
- Create a purchase variant with embedded `flat` scheme → confirm `GET` returns the scheme, no `price` field.
- Try to create a purchase variant with `tiered` scheme → expect 400.
- Create a rental variant with `tiered` scheme → check in → check out → verify line item math against TRD §FR-6.

**Exit criteria:** Backend matches every TRD §FR-6 row end-to-end.

---

## Phase 5: API Contract Update + Codegen

### 5.1 Edit `libs/api-contract/src/api.yaml`

- New schemas: `PricingScheme` (with `pricing_type`, `description`, `flat_price`, `tiers`), `PricingSchemeTier`.
- `Variant` schema: **remove** `price`. Add `pricing_scheme_id` (read-only) + embedded `pricing_scheme` object.
- `Variant` create/update bodies: **require** `pricing_scheme` block; **remove** `price`.
- `Rental` schema: add `snapshot_pricing_type`, `snapshot_flat_price`, `snapshot_tiers` (parsed array, not raw JSON), `running_total` (read-only, present only when `checkout_at` is null).
- No path additions.

### 5.2 Codegen + cleanup

Run codegen (`libs/api-contract/package.json` script). Then grep both apps for any TS reference to `variant.price` and resolve.

### 5.3 Verify

`nx build api-contract`, `nx build web`, `nx build mobile` all type-check.

**Exit criteria:** Generated TS types include the new shapes; both apps compile.

---

## Phase 6: Web Frontend

### 6.1 Variant create/edit form

Edit `apps/web/src/pages/products/[productId]/variants/...`:
- Replace the legacy `price` numeric input with an unconditional **Pricing** section.
- Pricing Type radio: `flat` (always) and `tiered` (only enabled when parent product `sale_type === 'rental'`; disabled with tooltip otherwise).
- For `tiered`: dynamic list of tier rows (`up_to_minutes` numeric, `price_per_person` numeric, Add/Remove buttons). Zod validates ascending minutes and positive prices, ≥1 tier.
- For `flat`: single `flat_price` input.
- Pricing Type radio is disabled on edit if the scheme already exists (immutability rule), with a tooltip: "To change pricing type, create a new variant."

### 6.2 Other web surfaces that read `variant.price`

Audit and update:
- Product list / detail pages displaying a price column.
- Cart / sale flow.
- Receipt printout.
- Anywhere a price formatter is called on `variant.price`.

Source new value from `variant.pricing_scheme.flat_price` (purchases are always flat).

### 6.3 Check-in screen

`apps/web/src/pages/rentals/checkin.tsx`:
- No new fields. Show a small badge under the variant choice describing its pricing (e.g., "Tiered: 1h=15K, 1.5h=20K, ..." or "Flat: 50K"), pulled from the embedded scheme.

### 6.4 Rental list + check-out

- List view: variant name + duration + `running_total` for ongoing.
- Check-out confirmation: per rental, `variant name • duration → subtotal`.

### 6.5 Verify

- `nx test web` passes — add component tests for the tier-editor's strictly-ascending-minutes validation and for the purchase-=-flat-disabled-radio behavior.
- `nx serve web` + manual walk:
  - Create a "Board Game — Hourly" variant with the seeded tiers → check in 1 person → fudge to 1h15m → expect **20K** at check-out.
  - Same with 1h35m → expect **30K**.
  - Create "Board Game — All Day Weekend" variant with `flat 60K` → check in 2 people (2 rows) → check out together → expect **120K**.
  - Create a purchase variant "T-shirt" with `flat 100K` → make a sale → confirm transaction line item is 100K.

**Exit criteria:** Every TRD §FR-6 row reproduces end-to-end in the web UI; existing purchase flows still produce correct totals.

---

## Phase 7: Mobile Frontend

### 7.1 Update screens

Mobile parity for: variant form (pricing section), check-in (pricing badge), check-out (line breakdown), and any purchase-side screens that previously read `variant.price`.

Most form primitives are shared via `libs/ui` — identify which screens already live there.

### 7.2 Verify

- `nx test mobile` passes.
- Walk the same 9 acceptance cases on a device/emulator.

**Exit criteria:** Mobile parity.

---

## Phase 8: Documentation + Release

1. Update `README.md` if it lists features.
2. Add a "How to add or change a pricing scheme" guide for the cafe owner under `docs/`.
3. Update `E2E_TEST_PLAN.md` with the new scenarios (rental tiered, rental flat, purchase flat).
4. PR description links to the TRD, calls out the breaking API change (removal of `variants.price`), and lists every TRD §FR-6 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| External API consumer breaks because `variants.price` is removed | Medium | High | Audit known consumers before the contract PR. If unavoidable, ship Phase 5 with a deprecated read-only `price` field (computed from `pricing_scheme.flat_price`) for one release cycle, then remove |
| Backfill mapping (variant → its newly-created flat scheme) is wrong → all prices scrambled | Low | Critical | Use a temp table with explicit `(old_variant_id, new_scheme_id)` mapping rather than relying on insertion order; verify with row counts and a SQL diff |
| Forgetting to preload `PricingScheme` on a variant read path causes nil deref in a transaction | Medium | High | Centralize preload in `variant_repo.go` for every read method; add a Go assertion in the variant transformer that `PricingSchemeId != 0` |
| `pricing_type` immutability surprises admin | Low | Low | Disable radio on edit + tooltip |
| JSON snapshot drift between FE and Go | Low | Medium | Both sides go through the OpenAPI-generated array type; server hides raw `snapshot_tiers_json` and exposes parsed `snapshot_tiers` |
| Historical rental backfill (TRD Open Q1) chosen wrong | Low | Low | Old data is a small set; document choice in migration; can revisit with a corrective migration if needed |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 | 1 day (backfill mapping is fiddly) | 2 |
| 2 | 1.5 days | 3, 4 |
| 3 | 1.5 days (variant audit) | 4 |
| 4 | 2 days (transaction handler also touched) | 5 |
| 5 | 0.5 day | 6, 7 |
| 6 | 2.5 days (purchase surfaces too) | 8 |
| 7 | 1.5 days | 8 |
| 8 | 0.5 day | — |

**Total:** ~10.5 working days, single engineer. The unification adds about 2 days vs. rental-only because every purchase surface that read `variant.price` now reads through the scheme.
