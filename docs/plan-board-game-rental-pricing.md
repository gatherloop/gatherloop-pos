# Implementation Plan: Board Game Rental Pricing

Companion to [`trd-board-game-rental-pricing.md`](./trd-board-game-rental-pricing.md).

## Overview

Attach a list of `(up_to_minutes, price_per_person)` rows directly to each **rental** variant via a new `pricing_tiers` table. `sale_type` drives the pricing source: purchase variants keep `variants.price` (which becomes nullable for rentals); rental variants have ≥1 tier and `price IS NULL`. At check-in, the variant's tier list is JSON-snapshotted onto the rental row. At check-out, a single-branch calculator does a tier lookup.

The hardcoded `MAX_HOUR := 6.0` and `variant.Price × hours` math in `apps/api/domain/rental_usecase.go:107-128` is replaced.

**Design rules driving this plan:**
- One rental row = one person. Groups create N rows.
- `sale_type` drives pricing source: purchase → `variants.price`; rental → `pricing_tiers`.
- No `pricing_schemes` table. Tiers attach directly to variants.
- Uniform rental pricing model: every rental variant has ≥1 tier; "All Day" is a 1-tier variant at `up_to_minutes = 840`.
- One snapshot column (`rentals.snapshot_tiers_json`), one calculator branch.
- Tiers are edited inline inside the rental variant form.

Phases are independently shippable: schema → domain → data → handler → contract → web → mobile → docs.

---

## Phase 1: Database Schema + Seeds

**Goal:** `pricing_tiers` exists; existing rental variants carry the seeded Hourly tier set; existing rentals carry a snapshot; `variants.price` is nullable. Purchase variants untouched.

### 1.1 Migration `000004_pricing_tiers`

`apps/api/migrations/000004_pricing_tiers.up.sql`:

1. `CREATE TABLE pricing_tiers (id, variant_id BIGINT REFERENCES variants(id), up_to_minutes INT, price_per_person FLOAT, created_at, UNIQUE(variant_id, up_to_minutes), KEY idx_variant_id)`.
2. `ALTER TABLE variants MODIFY COLUMN price FLOAT NULL` (was `FLOAT NOT NULL DEFAULT 0`).
3. `ALTER TABLE rentals ADD COLUMN snapshot_tiers_json JSON NULL`.
4. **Seed tiers for every existing rental variant** (Hourly defaults):
   ```sql
   INSERT INTO pricing_tiers (variant_id, up_to_minutes, price_per_person)
   SELECT v.id, t.up_to_minutes, t.price_per_person
   FROM variants v
   JOIN products p ON p.id = v.product_id
   CROSS JOIN (
     SELECT  60 AS up_to_minutes, 15000 AS price_per_person UNION ALL
     SELECT  90, 20000 UNION ALL SELECT 120, 30000 UNION ALL
     SELECT 180, 45000 UNION ALL SELECT 240, 60000 UNION ALL
     SELECT 300, 75000 UNION ALL SELECT 360, 90000
   ) t
   WHERE p.sale_type = 'rental';
   ```
5. **Null out price for existing rental variants:**
   ```sql
   UPDATE variants v JOIN products p ON p.id = v.product_id
   SET v.price = NULL
   WHERE p.sale_type = 'rental';
   ```
6. **Backfill snapshot for existing rentals** with the seeded Hourly tier list:
   ```sql
   UPDATE rentals
   SET snapshot_tiers_json = '[{"up_to_minutes":60,"price_per_person":15000},{"up_to_minutes":90,"price_per_person":20000},{"up_to_minutes":120,"price_per_person":30000},{"up_to_minutes":180,"price_per_person":45000},{"up_to_minutes":240,"price_per_person":60000},{"up_to_minutes":300,"price_per_person":75000},{"up_to_minutes":360,"price_per_person":90000}]';
   ```
7. `ALTER TABLE rentals MODIFY COLUMN snapshot_tiers_json JSON NOT NULL`.

`apps/api/migrations/000004_pricing_tiers.down.sql` (reverse):
- Drop `rentals.snapshot_tiers_json`.
- Restore `variants.price` for rental variants from their first tier's `price_per_person`:
  ```sql
  UPDATE variants v JOIN products p ON p.id = v.product_id
  JOIN pricing_tiers t ON t.variant_id = v.id
  SET v.price = t.price_per_person
  WHERE p.sale_type = 'rental' AND t.up_to_minutes = (SELECT MIN(up_to_minutes) FROM pricing_tiers WHERE variant_id = v.id);
  ```
- `ALTER TABLE variants MODIFY COLUMN price FLOAT NOT NULL DEFAULT 0`.
- `DROP TABLE pricing_tiers`.

### 1.2 Verify

- `go test ./apps/api/...` — still passes; no existing code references the new column.
- Migrate up → seeds present → migrate down → migrate up (idempotency).
- `SELECT COUNT(*) FROM pricing_tiers t JOIN variants v ON v.id = t.variant_id JOIN products p ON p.id = v.product_id WHERE p.sale_type = 'rental'` = 7 × (number of rental variants).
- `SELECT price FROM variants v JOIN products p ON p.id = v.product_id WHERE p.sale_type = 'rental'` — all NULL.
- `SELECT price FROM variants v JOIN products p ON p.id = v.product_id WHERE p.sale_type = 'purchase'` — all unchanged.
- `SELECT snapshot_tiers_json FROM rentals LIMIT 5` — populated.

**Exit criteria:** Migrations apply and revert cleanly on a DB with existing rental + purchase data.

---

## Phase 2: Domain Layer (Go)

**Goal:** Entities, repository, and the calculator exist with unit tests. No handlers wired up yet.

### 2.1 New entity

`apps/api/domain/pricing_tier_entity.go`:
```go
type PricingTier struct {
    Id             int64
    VariantId      int64
    UpToMinutes    int
    PricePerPerson float32
    CreatedAt      time.Time
}
```

No `PricingScheme` type, no `PricingType` enum.

### 2.2 Extend Variant entity

`apps/api/domain/variant_entity.go`:
- Change `Price float32` → `Price *float32` (nullable; nil for rental variants).
- Add `Tiers []PricingTier` (empty for purchase variants, ≥1 for rental variants, sorted ASC by `UpToMinutes`).

**Audit existing `variant.Price` references** in the domain layer. Most are in `transaction_usecase.go` (purchase flow) and the rental check-out (which is being rewritten anyway). Update each to deref the pointer with a clear "this is only called for purchase variants" comment, or change the signature to take a non-nil price. Files to check: `transaction_usecase.go`, `rental_usecase.go`, anywhere else `grep -rn 'variant\.Price\|Variant{.*Price' apps/api/domain` finds.

### 2.3 Extend Rental entity

`apps/api/domain/rental_entity.go`: add
```go
SnapshotTiersJSON string   // raw JSON; parsed by the calculator
```

One column.

### 2.4 Repository interface

`apps/api/domain/pricing_tier_repository.go`:
- `GetTiersByVariantId(ctx, variantId) ([]PricingTier, *Error)` — returns sorted ASC.
- `ReplaceTiersForVariant(ctx, variantId, tiers []PricingTier) *Error` — deletes existing rows and inserts the new list atomically.

Tier writes happen *through* the variant usecase, never independently — there is no `CreateTier` / `DeleteTier` standalone API.

### 2.5 Pricing calculator

`apps/api/domain/pricing_calculator.go` — pure function, no DB, single branch:

```go
type PricingResult struct {
    Price float32   // total for this one rental (one person)
}

func CalculatePrice(tiers []PricingTier, duration time.Duration) (PricingResult, *Error) {
    if len(tiers) == 0 {
        return PricingResult{}, &Error{Type: BadRequest, Message: "snapshot has no tiers"}
    }
    durationMinutes := int(math.Ceil(duration.Minutes()))
    for _, tier := range tiers {
        if tier.UpToMinutes >= durationMinutes {
            return PricingResult{Price: tier.PricePerPerson}, nil
        }
    }
    return PricingResult{Price: tiers[len(tiers)-1].PricePerPerson}, nil   // cap
}
```

Helper: `ParseSnapshotTiers(json string) ([]PricingTier, *Error)`.

### 2.6 Calculator tests

`apps/api/domain/pricing_calculator_test.go` — table-driven, covering every TRD §FR-5 row 1-8. Plus:
- Empty tier list → error.
- Duration exactly equal to a tier boundary (e.g., 60min against the 60-tier) → uses that tier.
- Duration above the largest tier → returns the cap.
- `ParseSnapshotTiers` malformed input → error.

### 2.7 Variant usecase validation

Update `apps/api/domain/variant_usecase.go` (create + update paths):
- Load parent product to read `sale_type`.
- If `purchase`: require `Price != nil`, `Tiers` empty.
- If `rental`: require `Price == nil`, `Tiers` non-empty with strictly ascending `UpToMinutes` and `PricePerPerson >= 0`.
- Reject `400` on violation.
- On update of a rental variant, call `ReplaceTiersForVariant` after persisting the variant row.

Update `variant_usecase_test.go` with cases for both happy paths and the four rejection cases.

### 2.8 Verify

`go test ./apps/api/domain/...` all green.

**Exit criteria:** Domain layer complete and tested in isolation. No handlers, no SQL.

---

## Phase 3: Data Layer (MySQL)

**Goal:** Repository from Phase 2 has a working GORM implementation.

### 3.1 GORM models

- `apps/api/data/mysql/pricing_tier_entity.go` — GORM struct.
- `apps/api/data/mysql/pricing_tier_transformer.go` — domain ↔ data converters.
- Extend `apps/api/data/mysql/variant_entity.go`: change `Price` to nullable; add `Tiers []PricingTier` `hasMany` relation.
- Extend `apps/api/data/mysql/rental_entity.go`: add `SnapshotTiersJSON string` column.

### 3.2 Repository implementation

`apps/api/data/mysql/pricing_tier_repo.go`:
- `GetTiersByVariantId` orders by `up_to_minutes ASC`.
- `ReplaceTiersForVariant` runs in a transaction: `DELETE FROM pricing_tiers WHERE variant_id = ?` then `INSERT` the new rows.

Variant repo (`variant_repo.go`) preloads `Tiers` ordered ASC on `GetVariantById` and on every list endpoint that returns embedded variants.

### 3.3 Wire into DI

Update `apps/api/main.go`:
- Construct `PricingTierRepository`.
- Pass it into the variant usecase constructor.
- The rental usecase doesn't need it directly — it reads tiers via the preloaded variant.

### 3.4 Verify

Existing tests still pass. Add a `GetTiersByVariantId` + `ReplaceTiersForVariant` round-trip test if the MySQL test harness exists.

**Exit criteria:** Repo works against MySQL; existing tests untouched.

---

## Phase 4: Modify Rental Usecase + Variant Handler

**Goal:** Variant create/update accepts an embedded tier list; check-in snapshots the tiers; check-out uses the calculator.

### 4.1 Extend variant handler with embedded tiers

In `apps/api/presentation/restapi/product_handler.go` (variants live under products) and the variant usecase:
- `POST /products/{id}/variants` request body: for rental products, requires `tiers: [{up_to_minutes, price_per_person}, ...]` and forbids `price`. For purchase products, requires `price` and forbids `tiers`.
- `PUT /variants/{id}` accepts the corresponding shape based on parent product's `sale_type`. Tier rows are replaced wholesale.
- `GET /variants/{id}` responses embed `tiers` (non-empty for rentals; empty for purchases). `price` is nullable.

### 4.2 Refactor `CheckinRentals`

In `apps/api/domain/rental_usecase.go`:
- For each incoming rental:
  1. Load the variant with its preloaded tiers.
  2. If the variant has zero tiers → reject `400` (defensive; should be unreachable via the variant form).
  3. JSON-encode `variant.Tiers` (ascending) into `rental.SnapshotTiersJSON`.
- Insert as today.

### 4.3 Refactor `CheckoutRentals`

Replace `rental_usecase.go:107-128` with:
```go
tiers, parseErr := ParseSnapshotTiers(existingRental.SnapshotTiersJSON)
if parseErr != nil { return parseErr }
result, err := CalculatePrice(tiers, checkoutAt.Sub(existingRental.CheckinAt))
if err != nil { return err }
```

Build `TransactionItem` with `Amount=1`, `Price=result.Price`, `Subtotal=result.Price`. Drop the `math` import + the `MAX_HOUR` constant + the now-unused `variantRepository.GetVariantById` call (keep only if needed for display name).

### 4.4 Update `rental_usecase_test.go`

New cases:
- Check-in of a rental variant with the 7-tier Hourly set → snapshot JSON matches.
- Check-in of a rental variant with zero tiers (defensive) → 400.
- Check-out reproducing TRD §FR-5 rows 1, 3, 4, 5, 6, 8. Group scenarios (rows 2, 7) at handler-test level.

### 4.5 Extend rental handler response

Edit `apps/api/presentation/restapi/rental_handler.go`:
- Rental list/get responses include `snapshot_tiers` (parsed array, not raw JSON, for FE convenience).
- For ongoing rentals (`CheckoutAt == nil`), include a server-computed `running_total` via `CalculatePrice` against `time.Now()`.

### 4.6 Verify

`go test ./apps/api/...` all green. Manual `curl` smoke:
1. Create a rental variant with the 7-tier Hourly list.
2. Check in.
3. Fudge timestamps; check out.
4. Verify the line item matches the expected tier.

**Exit criteria:** Backend behavior matches every TRD §FR-5 row end-to-end.

---

## Phase 5: API Contract Update + Codegen

**Goal:** TS clients reflect the new shapes.

### 5.1 Edit `libs/api-contract/src/api.yaml`

- New schema: `PricingTier { up_to_minutes, price_per_person }`.
- `Variant` schema: `price` becomes nullable; add `tiers: PricingTier[]` (empty for purchase).
- `Variant` create/update request bodies: conditional on parent product `sale_type` — `price` for purchase, `tiers` for rental.
- `Rental` schema: add `snapshot_tiers: PricingTier[]` and `running_total` (read-only, present when `checkout_at` is null).
- No path additions.

### 5.2 Codegen

Run the project's existing codegen script (check `libs/api-contract/package.json` and `openapitools.json`).

### 5.3 Verify

`nx build api-contract`, `nx build web`, `nx build mobile` all type-check. Existing purchase-variant consumers continue to compile; they need to handle `price` being nullable when they encounter rental variants, but most won't (purchase code paths only see purchase variants).

**Exit criteria:** Generated TS types include the new shapes; both apps still compile.

---

## Phase 6: Web Frontend

**Goal:** Admin manages tier tables inside the rental variant form; staff sees subtotals at check-out.

### 6.1 Variant create/edit form

Edit `apps/web/src/pages/products/[productId]/variants/...`:
- Conditional on parent product's `sale_type`:
  - `purchase` → existing simple `price` input. Unchanged.
  - `rental` → **Pricing Tiers** editor instead:
    - Dynamic list of `(up_to_minutes, price_per_person)` rows with Add/Remove.
    - Zod validates ≥1 row, strictly ascending minutes, positive prices.
    - Help text: *"A single tier behaves like a flat rate. e.g., 'All Day' = one tier at 840 minutes (the cafe's 14-hour operating window)."*

### 6.2 Check-in screen

Edit `apps/web/src/pages/rentals/checkin.tsx`:
- **No new fields.** Picking the variant picks the tiers.
- Small badge under the variant picker summarizes the tier list (e.g., "60min: 15K, 90min: 20K, …, cap: 90K" or "Flat: 50K up to 840min").
- The existing form already supports adding multiple rental items for groups.

### 6.3 Rental list + check-out

Edit `apps/web/src/pages/rentals/index.tsx` and `apps/web/src/pages/rentals/checkout.tsx`:
- List view: show variant name, duration so far, and (for ongoing) `running_total`.
- Check-out confirmation: per rental, show `variant name • duration → subtotal`. Show grand total.

### 6.4 Verify

- `nx test web` passes — add component tests for the tier-editor's ascending-minutes validation.
- `nx serve web` + manual walkthrough:
  - Create "Board Game — Hourly" rental variant with the 7-tier set → check in 1 person → fudge timestamps to 1h15m → check out → expect **20,000**.
  - Same at 1h35m → expect **30,000**.
  - Create "Board Game — All Day Weekend" rental variant with `{840→60K}` → check in 2 people (2 rental rows) → check out together → expect **120,000**.
  - Create a purchase variant — confirm the form still shows the simple `price` input and no tier editor.

**Exit criteria:** Every TRD §FR-5 row reproduces end-to-end in the web UI; purchase flow visibly unchanged.

---

## Phase 7: Mobile Frontend

**Goal:** React Native parity for check-in and check-out. Tier editing remains web-only for v1.

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
2. Add a short "How to add or change rental pricing tiers" guide for the cafe owner under `docs/`.
3. Update `E2E_TEST_PLAN.md` with the new scenarios.
4. PR description links to the TRD and lists every TRD §FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backfilling rental snapshots with the new 7-tier table doesn't exactly replay the old `price × hours, 6h cap` rule | Medium | Low | The 7-tier set is the new normal; document any drift in PR description. Only affects in-flight rentals spanning the migration |
| Admin edits tiers and is surprised that ongoing rentals don't reflect the change | Medium | Low | Surface explicitly in the variant edit form: "Existing rentals keep the original pricing; only future check-ins use the new tiers" |
| Rental variant saved with zero tiers blocks check-in | Medium | High | Variant usecase validation rejects this at save time; FE form's tier editor requires ≥1 row |
| Purchase variants accidentally gain tiers via API misuse | Low | Low | Variant usecase validation rejects tiers on purchase variants |
| `variants.price` becoming nullable breaks code paths that deref without checking | Medium | Medium | Grep audit in Phase 2.2 catches every reference; purchase paths still get non-nil; only rental paths see nil and they go through the new tier flow |
| JSON snapshot drift between FE parsing and Go encoding | Low | Medium | Both sides go through OpenAPI-generated `PricingTier[]` arrays, not raw JSON; server hides the raw `snapshot_tiers_json` column and exposes `snapshot_tiers` as an array in responses |

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
