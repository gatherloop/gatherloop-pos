# Implementation Plan: Rental Coupons

Companion to [`prd-rental-coupons.md`](./prd-rental-coupons.md).

## Overview

Give coupons three new dimensions — **scope** (`transaction` | `rental_item`), a **`free_duration`** type, and a **`min_play_minutes`** eligibility gate — then apply them **per ticket at rental checkout**, where play-time is finally known. The discount is materialized as money on `TransactionItem.DiscountAmount` (which already exists), so `transaction.Total = Σ subtotals` and the existing income/budget math in `PayTransaction` is untouched.

**Design rules driving this plan (from the PRD):**
- One rental row = one ticket = one `TransactionItem`. Per-ticket discounts live on that item.
- "Free X hours" = reduce billable minutes by `amount`, then re-price through the existing `CalculatePrice`. (PRD D1)
- Billable minutes ≤ 0 ⇒ ticket is free. (PRD D2)
- ≤ 1 coupon per ticket, no stacking. (PRD D4)
- All new columns are additive with defaults; only the checkout request body is a non-additive change, isolated to Phase 5–7. (PRD D9)
- Reuse `RoundToNearest500` for percentage discounts. (PRD D8)

Phases are independently shippable and ordered: schema/seed → domain → data → checkout usecase+handler → contract → coupon admin UI → checkout UI → mobile → docs. Each phase is one small PR.

---

## Phase 1: Database Schema + Seed

**Goal:** Coupons can carry scope/eligibility; `transaction_coupons` can point at a ticket; the three coupons exist. Existing data untouched and behaviorally identical.

### 1.1 Migration `000012_rental_coupons`

`apps/api/migrations/000012_rental_coupons.up.sql`:
```sql
ALTER TABLE coupons
  ADD COLUMN scope            VARCHAR(50) NOT NULL DEFAULT 'transaction',
  ADD COLUMN min_play_minutes INT         NOT NULL DEFAULT 0;

ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);

-- Seed the three coupons, idempotent on unique code
INSERT INTO coupons (code, type, amount, scope, min_play_minutes)
SELECT * FROM (
  SELECT 'FREE 1 HOUR'      AS code, 'free_duration' AS type, 60  AS amount, 'rental_item' AS scope, 120 AS min_play_minutes UNION ALL
  SELECT 'FREE 2 HOUR',           'free_duration',          120,        'rental_item',                 0 UNION ALL
  SELECT 'STUDENT DISCOUNT',      'percentage',              40,        'rental_item',                 0
) seed
WHERE NOT EXISTS (SELECT 1 FROM coupons c WHERE c.code = seed.code);
```

`apps/api/migrations/000012_rental_coupons.down.sql`:
```sql
DELETE FROM coupons WHERE code IN ('FREE 1 HOUR','FREE 2 HOUR','STUDENT DISCOUNT');
ALTER TABLE transaction_coupons
  DROP FOREIGN KEY fk_tc_transaction_item,
  DROP KEY idx_tc_transaction_item_id,
  DROP COLUMN transaction_item_id;
ALTER TABLE coupons DROP COLUMN min_play_minutes, DROP COLUMN scope;
```

### 1.2 Verify
- Migrate up → down → up (idempotency); seed insert does not duplicate on re-run.
- `SELECT scope, min_play_minutes FROM coupons` — pre-existing coupons all `('transaction', 0)`.
- `go test ./apps/api/...` still green (no Go reads the new columns yet).

**Exit criteria:** Migration applies/reverts cleanly on a DB with existing coupons + transactions.

---

## Phase 2: Domain Layer (Go)

**Goal:** Entity + a pure per-ticket discount calculator with exhaustive unit tests. No handlers wired.

### 2.1 Extend the coupon entity

`apps/api/domain/coupon_entity.go`:
```go
const FreeDuration CouponType = "free_duration"

type CouponScope string
const ( ScopeTransaction CouponScope = "transaction"; ScopeRentalItem CouponScope = "rental_item" )

type Coupon struct {
    Id; Code; Type CouponType; Amount int64
    Scope          CouponScope   // new
    MinPlayMinutes int64         // new
    CreatedAt; DeletedAt
}
```
Add `Scope`/`MinPlayMinutes` to `TransactionCoupon` snapshot only if needed for display; otherwise add a nullable `TransactionItemId *int64` to `TransactionCoupon` in `transaction_entity.go`.

### 2.2 Per-ticket discount calculator

New `apps/api/domain/coupon_calculator.go` — pure, no DB, implements PRD FR-3:
```go
type TicketDiscount struct { Base, Discount, Subtotal float32 }

func CalculateRentalCouponDiscount(
    tiers []PricingTier, duration time.Duration, coupon *Coupon,
) (TicketDiscount, *Error) {
    base, err := CalculatePrice(tiers, duration)
    if err != nil { return TicketDiscount{}, err }
    if coupon == nil { return TicketDiscount{base.Price, 0, base.Price}, nil }
    if coupon.Scope != ScopeRentalItem {
        return TicketDiscount{}, &Error{Type: BadRequest, Message: "coupon not applicable to rental ticket"}
    }
    actualMin := int64(math.Ceil(duration.Minutes()))
    if actualMin < coupon.MinPlayMinutes {
        return TicketDiscount{}, &Error{Type: BadRequest, Message: "play time below coupon minimum"}
    }
    var discount float32
    switch coupon.Type {
    case FreeDuration:
        billable := actualMin - coupon.Amount
        var discounted float32
        if billable > 0 {
            d, _ := CalculatePrice(tiers, time.Duration(billable)*time.Minute)
            discounted = d.Price
        } // billable <= 0 -> discounted stays 0 (PRD D2)
        discount = base.Price - discounted
    case Percentage:
        discount = float32(utils.RoundToNearest500(int(base.Price) * int(coupon.Amount) / 100))
    case Fixed:
        discount = float32(coupon.Amount)
        if discount > base.Price { discount = base.Price }
    }
    return TicketDiscount{base.Price, discount, base.Price - discount}, nil
}
```

### 2.3 Calculator tests

`apps/api/domain/coupon_calculator_test.go` — table-driven, covering **every PRD FR-3 row 1–7**, plus:
- Wrong scope (`transaction` coupon) → error.
- `free_duration` exactly reducing to a tier boundary.
- `fixed` larger than base → clamped, subtotal 0, no negative.
- `nil` coupon → zero discount.

### 2.4 Coupon usecase validation

`apps/api/domain/coupon_usecase.go` create/update: enforce PRD FR-1 (`free_duration ⇒ rental_item & amount>0`; `percentage ⇒ 0<amount≤100`; `fixed ⇒ amount>0`; `min_play_minutes ≥ 0`). Add tests.

### 2.5 Verify
`go test ./apps/api/domain/...` green.

**Exit criteria:** Domain complete and tested in isolation; no SQL, no handlers.

---

## Phase 3: Data Layer (MySQL)

**Goal:** Repos read/write the new columns and the ticket link.

### 3.1 GORM models + transformers
- `apps/api/data/mysql/coupon_entity.go` + transformer: map `scope`, `min_play_minutes` both ways.
- `apps/api/data/mysql/transaction_entity.go` (transaction_coupons model) + transformer: map nullable `transaction_item_id`.

### 3.2 Verify
- Existing coupon repo tests pass.
- Round-trip test: create a `rental_item` coupon → read back scope + min_play intact.

**Exit criteria:** Repos persist/read new fields; existing tests untouched.

---

## Phase 4: Rental Checkout Usecase + Handler

**Goal:** Checkout accepts an optional coupon per ticket, applies the discount, records the link. This is the core behavioral PR.

### 4.1 Change the checkout input shape (backend)

`apps/api/domain/rental_usecase.go` — `CheckoutRentals` signature changes from `rentalIds []int64` to a slice of `{ RentalId int64; CouponId *int64 }`. For each rental:
1. Load rental, guard double-checkout (unchanged).
2. `duration = checkoutAt − checkin_at`.
3. If `CouponId != nil`: load coupon via `couponRepository.GetCouponById`, call `CalculateRentalCouponDiscount(snapshot, duration, &coupon)`. On error → return it (the surrounding `BeginTransaction` rolls everything back).
4. Build `TransactionItem` with `Price=base`, `DiscountAmount=discount`, `Subtotal=base−discount`.
5. After the transaction is created, insert a `transaction_coupons` row `{transaction_id, coupon_id, transaction_item_id, type, amount}` per applied coupon.

`RentalUsecase` needs a `couponRepository` dependency — add it to the constructor and `apps/api/main.go` DI wiring.

### 4.2 Handler

`apps/api/presentation/restapi/rental_handler.go` — checkout handler parses the new request `{ rentals: [{ rentalId, couponId? }] }`. Keep accepting the old `rentalIds` shape for one release **only if** any non-frontend consumer exists; otherwise change outright (internal API, both frontends updated in Phase 5–7).

### 4.3 Tests

`rental_usecase_test.go`:
- Checkout, no coupons → unchanged totals (regression).
- FREE 1 HOUR on a 2h ticket → subtotal 15K (PRD FR-3 #1).
- FREE 1 HOUR on a 90m ticket → 400.
- FREE 2 HOUR on a 1h ticket → subtotal 0 (PRD FR-3 #5).
- Multi-ticket: 3 tickets, STUDENT on the middle one → only it discounted (PRD FR-5).
- `transaction_coupons` row written with correct `transaction_item_id`.

### 4.4 Verify
`go test ./apps/api/...` green; `curl` smoke for one free-duration and one percentage checkout.

**Exit criteria:** Backend reproduces every PRD FR-3/FR-5 case end-to-end.

---

## Phase 5: API Contract + Codegen

**Goal:** TS clients reflect new shapes; both apps compile.

### 5.1 Edit `libs/api-contract/src/api.yaml`
- `Coupon` + `CouponForm`: add `scope` enum, `minPlayMinutes`; `type` enum gains `free_duration`. (additive)
- Checkout request: `{ rentals: [{ rentalId, couponId? }] }`. (**breaking** — coordinated here)
- `TransactionCoupon`: add optional `transactionItemId`. (additive)

### 5.2 Codegen
Run the project's codegen (per `libs/api-contract/package.json` / `openapitools.json`).

### 5.3 Update the FE checkout usecase signature
`libs/ui/src/domain/usecases/rentalCheckout.ts` + its test: pass `{ rentalId, couponId? }[]`. Keep callers compiling (Phase 7 wires real UI; here just default `couponId` undefined so behavior is identical).

### 5.4 Verify
`nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` all green.

**Exit criteria:** Generated types include new shapes; checkout still works with no coupons selected.

---

## Phase 6: Coupon Admin UI

**Goal:** Owner can create/edit all coupon kinds, including the three rental coupons.

### 6.1 Frontend entity + form
- `libs/ui/src/domain/entities/Coupon.ts`: extend `CouponType` with `'free_duration'`; add `scope`, `minPlayMinutes` to `Coupon` and `CouponForm`.
- Coupon form component + Zod schema (PRD FR-6): scope selector; `free_duration` type; conditional `min_play_minutes` input; adaptive amount label ("Amount (Rp)" / "Percent (%)" / "Free minutes"). Mirror Phase 2.4 validation.
- `apps/web/src/pages/coupons/...` create/edit pages render the extended form.

### 6.2 Verify
`nx test web`/`nx test ui`; manually create FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT and confirm they persist with correct scope + min play.

**Exit criteria:** All three coupons are creatable/editable from the web admin.

---

## Phase 7: Web Checkout Screen

**Goal:** Per-ticket coupon selection with eligibility + live totals (PRD FR-7).

### 7.1 Checkout screen
The `libs/ui` screen behind `apps/web/src/pages/rentals/checkout.tsx`:
- Per ticket: player • variant • duration • base price.
- "Apply coupon" control listing only `rental_item` coupons; disable coupons where `ceil(actualMinutes) < minPlayMinutes` with a hint.
- On select: show discount + new subtotal for that ticket; recompute the grand total live. Allow clearing. One coupon per ticket.
- Submit sends `{ rentals: [{ rentalId, couponId? }] }`.

Reuse the existing `CouponList` sheet pattern (`libs/ui/src/presentation/components/coupons/CouponList.tsx`), filtered to `rental_item` scope and parameterized by per-ticket eligibility.

### 7.2 Verify
`nx serve web` walkthrough reproducing PRD FR-3 #1, #3 (disabled), #5, #6 and the FR-5 multi-ticket case. `nx test web`.

**Exit criteria:** Every PRD FR-3/FR-5 case reproduces in the web checkout UI; transaction-create screen visibly unchanged.

---

## Phase 8: Mobile Parity

**Goal:** React Native checkout offers the same per-ticket coupon picker (PRD FR-8).

- `apps/mobile/` checkout screen: same per-ticket picker, reusing shared `libs/ui` primitives where possible.
- Coupon **admin** editing stays web-only for v1.
- `nx test mobile`; walk the same acceptance cases on emulator.

**Exit criteria:** Mobile staff can apply per-ticket coupons at checkout with correct totals.

---

## Phase 9: Documentation + Release

1. Short owner guide under `docs/`: "Rental coupons — how FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT work and when each applies."
2. Update `E2E_TEST_PLAN.md` with the new checkout-coupon scenarios.
3. Update `README.md` feature list if present.
4. PR description links the PRD and lists every FR-3/FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Checkout request shape change breaks an un-updated consumer | Low | High | Internal API; both frontends updated in Phases 5/7/8 in lockstep with the contract. Optionally accept the legacy `rentalIds` shape for one release. |
| Free-duration math drifts from staff expectation (D1/D2) | Medium | Medium | PRD worked examples are the acceptance tests; surface "Billed as Xh (1h free)" on the checkout line so staff see the reasoning. Open Question #1 confirms D2 with the owner. |
| Income/budget math regresses if discount isn't on `Subtotal` | Low | High | Discount always lands on `TransactionItem.DiscountAmount`; `Subtotal = base − discount`; `Total = Σ subtotals`. Phase 4 regression test asserts unchanged totals for the no-coupon path. |
| A `transaction`-scope coupon gets applied to a ticket (or vice versa) | Low | Medium | Calculator rejects wrong scope (Phase 2.2); UI offers only the matching scope per surface (PRD D5). |
| Negative subtotal from an over-large `fixed` coupon | Low | Medium | `fixed` discount clamped to base in the calculator. |
| Eligible-coupon UI lets staff pick an ineligible one | Low | Medium | UI disables ineligible coupons **and** the server re-validates (PRD D6); checkout rolls back on violation. |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Schema + seed | 0.5 day | 2 |
| 2 Domain + calculator | 1 day | 3, 4 |
| 3 Data layer | 0.5 day | 4 |
| 4 Checkout usecase + handler | 1.5 days | 5 |
| 5 Contract + codegen | 0.5 day | 6, 7 |
| 6 Coupon admin UI | 1 day | 7 |
| 7 Web checkout UI | 1.5 days | 8 |
| 8 Mobile parity | 1 day | 9 |
| 9 Docs + release | 0.5 day | — |

**Total:** ~8 working days, single engineer. Each phase is one reviewable PR.
