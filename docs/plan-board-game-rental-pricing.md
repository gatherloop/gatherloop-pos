# Implementation Plan: Board Game Rental Pricing

Companion to [`trd-board-game-rental-pricing.md`](./trd-board-game-rental-pricing.md). This plan slices the work into independently mergeable phases — each phase compiles, passes tests, and leaves the system shippable.

## Overview

We are introducing a `RentalPricingScheme` entity, linking it many-to-many with rental variants, and rewriting the check-in/check-out flow to capture a player count + a snapshot of the chosen scheme. The hardcoded `MAX_HOUR := 6.0` in `apps/api/domain/rental_usecase.go:108` and the `variant.Price × hours` math get replaced by a snapshot-driven `PricingCalculator`.

Work proceeds **back-to-front**: schema → domain → API → contract → web → mobile. Each phase has explicit deliverables and a test gate.

---

## Phase 0: Confirm FR-5 Ambiguity

**Goal:** Resolve the "1h 15m → 20K" question in TRD §FR-5 *before* writing the calculator, since the answer determines whether we implement FR-6 (multi-tier hourly).

**Steps:**
1. Send the worked-examples table to the cafe owner.
2. If owner confirms grace-rounding behavior (rows 3-5 stand) → proceed with this plan as written.
3. If owner wants a tier table → fold FR-6 into Phase 2's data model and Phase 3's calculator before starting.

**Exit criteria:** Written confirmation captured in the PR description.

---

## Phase 1: Database Schema + Seeds

**Goal:** New tables exist; existing rentals backfilled; nothing reads from them yet.

### 1.1 Add migration `000004_rental_pricing_schemes`

`apps/api/migrations/000004_rental_pricing_schemes.up.sql`:

- `CREATE TABLE rental_pricing_schemes` — columns and CHECK constraint per TRD "Data Model Changes".
- `CREATE TABLE variant_pricing_schemes` — join table.
- `ALTER TABLE rentals ADD COLUMN pricing_scheme_id BIGINT NULL` (initially nullable so backfill can run).
- `ALTER TABLE rentals ADD COLUMN player_count INT NOT NULL DEFAULT 1`.
- `ALTER TABLE rentals ADD COLUMN snapshot_*` (six columns).
- Seed `INSERT INTO rental_pricing_schemes` for `Hourly`, `All Day Weekday`, `All Day Weekend`.
- Backfill `UPDATE rentals SET pricing_scheme_id = <Hourly id>, snapshot_* = <Hourly values>` for all existing rows.
- Backfill `INSERT INTO variant_pricing_schemes` linking every existing `rental`-type variant to all three seeded schemes.
- `ALTER TABLE rentals MODIFY COLUMN pricing_scheme_id BIGINT NOT NULL` + add FK + index.

`apps/api/migrations/000004_rental_pricing_schemes.down.sql`:
- Reverse in opposite order. Drop FK and columns from `rentals`; drop the two new tables.

### 1.2 Verify

- `go test ./apps/api/...` — should still pass; nothing references the new columns yet.
- Manual: run migrate up, verify seeds via `SELECT * FROM rental_pricing_schemes`, run migrate down, run migrate up again (idempotency check).

**Exit criteria:** Migrations apply and revert cleanly on a fresh DB and on a DB with existing rental data.

---

## Phase 2: Domain Layer (Go)

**Goal:** New entities, repositories, and the pricing calculator exist with unit tests, but no HTTP handler wires them up yet.

### 2.1 New domain entities

Create `apps/api/domain/rental_pricing_scheme_entity.go`:
- `type PricingType string` with `PricingTypeHourly`, `PricingTypeFlat` constants.
- `type RentalPricingScheme struct { Id, Name, PricingType, Description, IsActive, BlockMinutes, GraceMinutes, PricePerBlock, MaxBlocks, FlatPrice, CreatedAt, DeletedAt }` — pointer types for the optional fields.

### 2.2 Extend Rental entity

Edit `apps/api/domain/rental_entity.go`:
- Add `PricingSchemeId int64`, `PricingScheme RentalPricingScheme`, `PlayerCount int`, and the six `Snapshot*` fields.

### 2.3 Repository interfaces

Create `apps/api/domain/rental_pricing_scheme_repository.go`:
- `GetSchemeList`, `GetSchemeById`, `CreateScheme`, `UpdateScheme`, `DeleteScheme`.
- `GetSchemesByVariantId(variantId)`.
- `ReplaceVariantSchemes(variantId, schemeIds)`.
- `IsSchemeLinkedToVariant(variantId, schemeId)`.

### 2.4 Pricing calculator

Create `apps/api/domain/rental_pricing_calculator.go` — pure function, no DB access:

```go
type SnapshotPricing struct {
    Type          PricingType
    BlockMinutes  *int
    GraceMinutes  *int
    PricePerBlock *float32
    MaxBlocks     *int
    FlatPrice     *float32
}

type PricingResult struct {
    BillableUnits float32 // blocks for hourly, 1 for flat
    UnitPrice     float32 // per-block-per-person or flat-per-person
    Total         float32
}

func CalculatePrice(snap SnapshotPricing, players int, duration time.Duration) (PricingResult, *Error)
```

The `hourly` branch implements:
```
fullBlocks      = int(durationMinutes / blockMinutes)
remainder       = durationMinutes % blockMinutes
billableBlocks  = fullBlocks + (1 if remainder > graceMinutes else 0)
if maxBlocks != nil { billableBlocks = min(billableBlocks, *maxBlocks) }
total           = pricePerBlock * billableBlocks * players
```

The `flat` branch returns `flatPrice * players`.

### 2.5 Tests for the calculator

Create `apps/api/domain/rental_pricing_calculator_test.go` with table-driven tests covering every row of TRD §FR-5:

| Case | Input | Expected total |
|---|---|---|
| 2h, 1 player, hourly 15K | duration=2h | 30,000 |
| 3h, 2 players, hourly 15K | duration=3h | 90,000 |
| 1h15m, 1 player, hourly | duration=75m | 15,000 (grace forgives) |
| 1h16m, 1 player, hourly | duration=76m | 30,000 (rounds up) |
| 1h35m, 1 player, hourly | duration=95m | 30,000 (rounds up) |
| 7h, 1 player, hourly cap=6 | duration=7h | 90,000 (capped) |
| flat 50K, 1 player | duration=irrelevant | 50,000 |
| flat 50K, 3 players | n/a | 150,000 |
| flat 60K, 2 players | n/a | 120,000 |

Plus error cases: `players < 1`, mismatched type/snapshot fields (e.g., `Type=hourly` with nil `BlockMinutes`).

### 2.6 Scheme usecase

Create `apps/api/domain/rental_pricing_scheme_usecase.go` with CRUD methods. Validation:
- `Name` non-empty, unique among non-deleted.
- `PricingType` cannot be changed on update.
- For `hourly`: `BlockMinutes > 0`, `GraceMinutes >= 0`, `PricePerBlock > 0`, `MaxBlocks > 0` if set.
- For `flat`: `FlatPrice > 0`.

Add `apps/api/domain/rental_pricing_scheme_usecase_test.go` mirroring the existing `*_usecase_test.go` patterns.

### 2.7 Verify

`go test ./apps/api/domain/...` — all green, including the 9 calculator cases above.

**Exit criteria:** Domain layer is complete and tested in isolation. No handlers, no SQL.

---

## Phase 3: Data Layer (MySQL)

**Goal:** The repository interfaces from Phase 2 have working GORM implementations.

### 3.1 GORM models

Add `apps/api/data/mysql/rental_pricing_scheme_entity.go` (GORM struct) and `rental_pricing_scheme_transformer.go` (domain ↔ data converters), following the pattern in `rental_entity.go` + `rental_transformer.go`.

Update `apps/api/data/mysql/rental_entity.go` to add the new columns (`PricingSchemeId`, `PlayerCount`, snapshot columns) and the `belongsTo` relation to `RentalPricingScheme`.

### 3.2 Repository implementation

Create `apps/api/data/mysql/rental_pricing_scheme_repo.go` implementing the Phase 2.3 interface. Include the join-table operations for `variant_pricing_schemes`.

### 3.3 Wire into DI

Update `apps/api/main.go` (or wherever repos/usecases are instantiated) to construct the new repo and inject it into the new usecase. Pass the same repo into a *modified* `RentalUsecase` constructor (next phase).

### 3.4 Verify

Existing handler integration tests still pass (`go test ./apps/api/...`). Add a thin integration test for `GetSchemeList` + `CreateScheme` round-trip if the project has a test DB harness; otherwise rely on Phase 4's handler tests.

**Exit criteria:** Repos work against a real MySQL test DB; existing tests untouched.

---

## Phase 4: Modify Rental Usecase + Add Pricing Scheme Handler

**Goal:** Check-in captures the new fields and snapshots; check-out uses the calculator. New `/pricing-schemes` HTTP routes are live.

### 4.1 Refactor `RentalUsecase.CheckinRentals`

In `apps/api/domain/rental_usecase.go`:
- Inject the new `RentalPricingSchemeRepository` via the constructor.
- Update `CheckinRentals` signature to accept `pricing_scheme_id` and `player_count` per rental.
- For each rental: load the scheme, validate `IsSchemeLinkedToVariant`, copy snapshot fields onto the `Rental` before insert.
- Validation errors → `BadRequest`.

### 4.2 Refactor `RentalUsecase.CheckoutRentals`

Replace lines 107-128 with:
```go
snap := SnapshotPricing{
    Type:          existingRental.SnapshotPricingType,
    BlockMinutes:  existingRental.SnapshotBlockMinutes,
    GraceMinutes:  existingRental.SnapshotGraceMinutes,
    PricePerBlock: existingRental.SnapshotPricePerBlock,
    MaxBlocks:     existingRental.SnapshotMaxBlocks,
    FlatPrice:     existingRental.SnapshotFlatPrice,
}
result, err := CalculatePrice(snap, existingRental.PlayerCount, checkoutAt.Sub(existingRental.CheckinAt))
```
- `TransactionItem.Amount = result.BillableUnits`
- `TransactionItem.Price  = result.UnitPrice`
- `TransactionItem.Subtotal = result.Total`
- Drop the `MAX_HOUR := 6.0` line and the `math` import if unused.
- Drop the now-unused `variantRepository.GetVariantById` call (variant fetched only for display info, if at all).

### 4.3 Update `rental_usecase_test.go`

Add cases for: check-in with valid scheme, check-in with mismatched scheme/variant, check-out producing each of the 9 example totals from TRD §FR-5.

### 4.4 New handler: `rental_pricing_scheme_handler.go`

Create `apps/api/presentation/restapi/rental_pricing_scheme_handler.go` mirroring `product_handler.go`:
- `GET /pricing-schemes` (with `is_active`, `query`, `skip`, `limit`)
- `GET /pricing-schemes/{id}`
- `POST /pricing-schemes`
- `PUT /pricing-schemes/{id}`
- `DELETE /pricing-schemes/{id}`
- `GET /variants/{id}/pricing-schemes`
- `PUT /variants/{id}/pricing-schemes`

Register routes in the route setup file alongside existing handlers.

### 4.5 Modify rental handler

Edit `apps/api/presentation/restapi/rental_handler.go`:
- Check-in DTO adds `PricingSchemeId int64`, `PlayerCount int`.
- Check-in response includes the snapshotted scheme + player count for confirmation.
- Rental list/get response includes `PricingScheme`, `PlayerCount`, and (if `CheckoutAt == nil`) a `RunningTotal` computed via `CalculatePrice` against `time.Now()`.

### 4.6 Verify

`go test ./apps/api/...` all green. Manual smoke via `curl`: create scheme, link to variant, check-in, wait/fudge timestamps, check-out, verify transaction line items.

**Exit criteria:** Backend behavior matches the TRD acceptance table end-to-end.

---

## Phase 5: API Contract Update + Codegen

**Goal:** TS clients in `libs/api-contract/` reflect the new endpoints and DTOs.

### 5.1 Edit `libs/api-contract/src/api.yaml`

- New `RentalPricingScheme` schema with all fields and the discriminator on `pricing_type`.
- New paths: `/pricing-schemes`, `/pricing-schemes/{id}`, `/variants/{id}/pricing-schemes`.
- Update `Rental` schema: add `pricing_scheme_id`, `pricing_scheme`, `player_count`, `running_total`, and all `snapshot_*` fields (read-only).
- Update `RentalCheckinRequest` body: add required `pricing_scheme_id`, `player_count`.

### 5.2 Run codegen

`npm run generate:api-contract` (or the project's equivalent — confirm by reading `libs/api-contract/package.json` scripts and `openapitools.json`).

### 5.3 Verify

- `nx build api-contract` succeeds.
- `nx build web` and `nx build mobile` still type-check (nothing consumes the new fields yet — added in Phases 6 and 7).

**Exit criteria:** Generated TS types include the new entities; both apps still compile.

---

## Phase 6: Web Frontend

**Goal:** Admin can manage schemes; staff can pick a scheme + player count at check-in; check-out shows the line breakdown.

### 6.1 Pricing schemes admin pages

Add under `apps/web/src/pages/pricing-schemes/`:
- `index.tsx` — list (table with name, type, headline rate, active toggle, edit/delete).
- `create.tsx` — form with conditional fields based on `pricing_type` radio.
- `[schemeId]/edit.tsx` — same form, `pricing_type` field disabled.

Build in the existing pattern (React Query hooks from generated client, Tamagui form components, Zod schema for validation). Add navigation entry to the sidebar/menu wherever `Products`, `Categories`, etc. live.

### 6.2 Variant ↔ scheme linking

Edit `apps/web/src/pages/products/[productId]/variants/...` (the variant edit form):
- For variants whose product has `sale_type: "rental"`, render a multi-select of active schemes.
- On save, call `PUT /variants/{id}/pricing-schemes`.

### 6.3 Check-in screen

Edit `apps/web/src/pages/rentals/checkin.tsx`:
- After variant selection, fetch `GET /variants/{id}/pricing-schemes` and render a scheme picker (radio or select).
- Add a numeric `player_count` input (default 1, min 1).
- Disable submit until scheme + player count are valid.
- Send the new fields in the check-in mutation.

### 6.4 Rental list / check-out screen

Edit `apps/web/src/pages/rentals/index.tsx` and `apps/web/src/pages/rentals/checkout.tsx`:
- List view: show `pricing_scheme.name`, `player_count`, and (for ongoing) `running_total`.
- Check-out confirmation: per rental, show `scheme name • players • duration → subtotal`. Show grand total before submit.

### 6.5 Verify

- `nx test web` passes (add component-level tests for the scheme form's conditional fields and for the check-in disabled-state logic).
- `nx build web` + manual run of `nx serve web`. Walk the full flow in the browser per TRD §FR-5: create three rentals (hourly 1h15m / hourly 1h35m / flat weekend 2 players), check out, verify totals.

**Exit criteria:** All 9 acceptance examples from TRD §FR-5 produce the expected totals end-to-end via the web UI.

---

## Phase 7: Mobile Frontend

**Goal:** React Native parity with web for check-in and check-out.

### 7.1 Reuse from `libs/ui` where possible

Most form primitives are shared via Tamagui in `libs/ui`. Identify which check-in/check-out screens already live there vs. in `apps/mobile/`.

### 7.2 Update mobile rental flows

Same fields and validation as Phase 6.3 / 6.4. Admin scheme management does *not* need a mobile screen for v1 — schemes are managed from web only. (Document this in the release notes.)

### 7.3 Verify

- `nx test mobile` passes.
- Build a dev binary and walk the same 9 acceptance cases on a device or emulator.

**Exit criteria:** Mobile staff can check in with scheme + players and see correct totals at check-out.

---

## Phase 8: Documentation + Release

**Goal:** Internal docs reflect new pricing model; cafe staff have a one-pager.

1. Update `README.md` if it lists features.
2. Add a short "How to add a new pricing scheme" section to `docs/` for the cafe owner.
3. Update `E2E_TEST_PLAN.md` with the new check-in/check-out scenarios.
4. PR description links to the TRD and lists every acceptance case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FR-5 ambiguity is actually a tier requirement | Medium | High (rework calculator + schema) | Phase 0 blocks everything until confirmed |
| Backfill of historical rentals miscomputes snapshot values | Low | Medium (auditors see wrong "what they were quoted") | Existing rentals are all "Hourly", so seeding `Hourly` snapshot values is exact. Verify with a SQL diff before/after |
| Snapshot drift — admin edits a scheme and gets confused why old rentals don't update | Medium | Low | Make snapshot behavior explicit in the admin edit screen ("Existing rentals keep their original price; only future check-ins use the new rate") |
| Forgetting to link existing rental variants to seeded schemes blocks check-in | Low | High (cafe can't operate) | Backfill `variant_pricing_schemes` in the same migration as the table create (Phase 1.1) |
| Breaking change to `/rentals/checkin` body shape breaks mobile if released before mobile ships | Medium | Medium | Ship Phases 5-7 in one release; or accept legacy body (no `pricing_scheme_id`) by defaulting to `Hourly` for one release cycle |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 0 | 1 day (waiting on owner) | Everything |
| 1 | 0.5 day | 2 |
| 2 | 1.5 days | 3, 4 |
| 3 | 1 day | 4 |
| 4 | 1.5 days | 5 |
| 5 | 0.5 day | 6, 7 |
| 6 | 2 days | 8 |
| 7 | 1 day | 8 |
| 8 | 0.5 day | — |

**Total:** ~9 working days after FR-5 confirmation, single engineer.
