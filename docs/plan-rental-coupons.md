# Implementation Plan: Per-Item Coupons

Companion to [`prd-rental-coupons.md`](./prd-rental-coupons.md).

## Overview

Let a coupon target **one `TransactionItem`** instead of the whole transaction. That single capability covers all three requested coupons:

| Coupon | type | amount | scope |
|---|---|---:|---|
| FREE 1 HOUR | `fixed` | 15,000 | `item` |
| FREE 2 HOUR | `fixed` | 30,000 | `item` |
| STUDENT DISCOUNT | `percentage` | 40 | `item` |

Coupons are attached **after checkout, on the transaction edit screen** (PRD D2). Rental checkout is unchanged. The discount lands on `TransactionItem.DiscountAmount`, so `Total = Σ subtotals` and the `PayTransaction` income/budget math is untouched.

**Design rules (from the PRD):**
- New coupon dimension is just `scope` (`transaction` | `item`); types stay `fixed`/`percentage`. (No `free_duration`.)
- "Free N hours" = fixed rupiah, clamped to the item price. (D1, D3)
- ≤ 1 item-coupon per line, no stacking. (D4)
- 2-hour minimum for FREE 1 HOUR is staff discretion, shown via the line's duration note. (D6)
- **Prerequisite:** make the transaction create/update path preserve rental-item prices (today it re-derives them from `variants.price = 0`). (D7 / Phase 3)
- All schema and contract changes additive. (D10)

Phases are independently shippable and ordered: schema/seed → domain → rental-safe update + item-coupon application → data layer → contract → coupon admin UI → transaction edit UI → mobile → docs. Each phase is one small PR.

---

## Phase 1: Database Schema + Seed

**Goal:** Coupons carry a scope; `transaction_coupons` can point at an item; the three coupons exist. Existing data behaviorally identical.

### 1.1 Migration `000012_item_coupons`

`apps/api/migrations/000012_item_coupons.up.sql`:
```sql
ALTER TABLE coupons
  ADD COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'transaction';

ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);

INSERT INTO coupons (code, type, amount, scope)
SELECT * FROM (
  SELECT 'FREE 1 HOUR'      AS code, 'fixed'      AS type, 15000 AS amount, 'item' AS scope UNION ALL
  SELECT 'FREE 2 HOUR',           'fixed',            30000,        'item' UNION ALL
  SELECT 'STUDENT DISCOUNT',      'percentage',          40,        'item'
) seed
WHERE NOT EXISTS (SELECT 1 FROM coupons c WHERE c.code = seed.code);
```

`...down.sql`:
```sql
DELETE FROM coupons WHERE code IN ('FREE 1 HOUR','FREE 2 HOUR','STUDENT DISCOUNT');
ALTER TABLE transaction_coupons
  DROP FOREIGN KEY fk_tc_transaction_item,
  DROP KEY idx_tc_transaction_item_id,
  DROP COLUMN transaction_item_id;
ALTER TABLE coupons DROP COLUMN scope;
```

### 1.2 Verify
- Up → down → up; seed does not duplicate on re-run.
- Pre-existing coupons all read `scope = 'transaction'`.
- `go test ./apps/api/...` green (no Go reads the new columns yet).

**Exit criteria:** Migration applies/reverts cleanly on a DB with existing coupons + transactions.

---

## Phase 2: Domain Entities + Item-Discount Calculator

**Goal:** Entity changes + a pure per-item discount function with exhaustive tests. No usecase wiring yet.

### 2.1 Entities
- `apps/api/domain/coupon_entity.go`: add `CouponScope` (`ScopeTransaction`/`ScopeItem`) and `Scope CouponScope` on `Coupon`.
- `apps/api/domain/transaction_entity.go`: add `TransactionItemId *int64` to `TransactionCoupon`.

### 2.2 Calculator

New `apps/api/domain/coupon_calculator.go` — pure, implements PRD §3 / FR-4:
```go
func CalculateItemDiscount(base float32, coupon Coupon) (float32, *Error) {
    if coupon.Scope != ScopeItem {
        return 0, &Error{Type: BadRequest, Message: "coupon is not item-scoped"}
    }
    switch coupon.Type {
    case Fixed:
        d := float32(coupon.Amount)
        if d > base { d = base }            // clamp (D3)
        return d, nil
    case Percentage:
        return float32(utils.RoundToNearest500(int(base) * int(coupon.Amount) / 100)), nil
    }
    return 0, &Error{Type: BadRequest, Message: "unsupported coupon type"}
}
```

### 2.3 Tests
`apps/api/domain/coupon_calculator_test.go` — table-driven over **every PRD FR-4 row 1–7**, plus: non-item scope → error; fixed exactly equal to base → subtotal 0.

### 2.4 Coupon usecase validation
`apps/api/domain/coupon_usecase.go` create/update: enforce FR-1 (`scope` valid; `percentage` 0<amt≤100; `fixed` amt>0). Add tests.

**Exit criteria:** Domain compiles; calculator + validation tested in isolation.

---

## Phase 3: Rental-Safe Update + Item-Coupon Application (core PR)

**Goal:** Editing a rental transaction no longer destroys its prices, and item-scoped coupons discount the right line.

### 3.1 Preserve rental-item prices (PRD FR-2 / D7)
In `transaction_usecase.go`, both `CreateTransaction` (~:51-73) and `UpdateTransactionById` (~:126-149): for items with `RentalId != nil`, take `base` from the item's **stored** price (`item.Price * item.Amount`, or the persisted subtotal on update) instead of `variant.Price`. Non-rental items keep `base = variant.Price * item.Amount`.

### 3.2 Apply item-scoped coupons
Refactor the coupon loops (`:75-98`, `:151-174`):
- For each `TransactionCoupon`:
  - If `TransactionItemId == nil` → transaction-scope: subtract from `Total` exactly as today.
  - If set → load coupon, call `CalculateItemDiscount(itemBase, coupon)`, add to that item's `DiscountAmount`, recompute that item's `Subtotal = base − discount`. Enforce ≤1 item-coupon per line (D4).
- Compute `Total = Σ item.Subtotal` first, then apply transaction-scope coupons. Snapshot `{type, amount, transaction_item_id}` into the `transaction_coupons` rows.

### 3.3 Tests
`transaction_usecase_test.go`:
- **Regression:** edit + re-save a rental transaction → line prices and total unchanged (guards FR-2).
- FREE 1 HOUR on a 30K item → subtotal 15K (FR-4 #1).
- FREE 2 HOUR on a 15K item → subtotal 0 (FR-4 #4, clamp).
- STUDENT on a 30K item → 17,500 (FR-4 #5).
- Multi-item: 3 items, STUDENT on the middle → only it discounted (FR-5).
- Item coupon with a `transaction` scope → 400 (D5).

**Exit criteria:** Backend reproduces every FR-4/FR-5 case; rental transactions survive an edit.

---

## Phase 4: Data Layer (MySQL)

**Goal:** Repos map the new columns and the item link.

- `apps/api/data/mysql/coupon_entity.go` + transformer: map `scope`.
- `apps/api/data/mysql/transaction_entity.go` (transaction_coupons model) + transformer: map nullable `transaction_item_id`. Ensure item-coupon rows persist/read the link, and `transaction_items.discount_amount`/`subtotal` round-trip.
- Round-trip test: create a transaction with an item-scoped coupon → reload → discount + link intact.

**Exit criteria:** Repos persist/read the new fields; existing tests untouched.

> Note: domain tests in Phases 2–3 mock the repositories, so the order (domain before data) is fine; this phase makes the core PR runnable end-to-end against MySQL.

---

## Phase 5: API Contract + Codegen

**Goal:** TS clients reflect the additive shapes; both apps compile.

### 5.1 Edit `libs/api-contract/src/api.yaml`
- `Coupon` + `CouponForm`: add `scope` enum (`transaction`|`item`).
- `TransactionCoupon` (in transaction request + response): add optional `transactionItemId`.
- All additive — no breaking changes; `POST /rentals/checkout` untouched.

### 5.2 Codegen + verify
Run the project codegen (`libs/api-contract/package.json` / `openapitools.json`). `nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` green.

**Exit criteria:** Generated types include `scope` and `transactionItemId`; existing flows compile unchanged.

---

## Phase 6: Coupon Admin UI

**Goal:** Owner can create/edit coupons of either scope, including the three rental coupons.

- `libs/ui/src/domain/entities/Coupon.ts`: add `scope` to `Coupon` and `CouponForm`.
- Coupon form + Zod: **scope** selector; adaptive amount label ("Amount (Rp)" / "Percent (%)"); mirror Phase 2.4 validation.
- `apps/web/src/pages/coupons/...` create/edit pages render the extended form.
- `nx test web`/`nx test ui`; manually create FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT.

**Exit criteria:** All three coupons creatable/editable from the web admin.

---

## Phase 7: Transaction Edit Screen — Per-Item Coupon Picker

**Goal:** Staff attach an item-scoped coupon to a specific line (PRD FR-7).

- The `libs/ui` transaction screen (`TransactionCreateScreen.tsx` and its update counterpart): each line item gains an "Apply coupon" control listing only `item`-scoped coupons (reuse the `CouponList.tsx` sheet, filtered by scope).
- On select: show the line discount + new subtotal; recompute the grand total live; allow clearing; ≤1 per line.
- Filter the existing whole-bill picker to `transaction`-scoped coupons.
- Show the rental duration note next to each rental line (D6).
- Form submits each line's optional `couponId`; map into `transactionCoupons[].transactionItemId` on save.

### Verify
`nx serve web` walkthrough: check out a 2h rental → open the transaction → apply FREE 1 HOUR → subtotal 15K; apply STUDENT to one of several tickets → only that line discounts (FR-5). `nx test web`.

**Exit criteria:** Every FR-4/FR-5 case reproduces in the web transaction edit UI; whole-bill coupon behavior unchanged.

---

## Phase 8: Mobile Parity

**Goal:** React Native transaction edit screen offers the same per-item picker (PRD FR-8).

- `apps/mobile/` transaction screen: per-item coupon picker reusing shared `libs/ui` primitives. Coupon **admin** editing stays web-only for v1.
- `nx test mobile`; walk the same acceptance cases on emulator.

**Exit criteria:** Mobile staff can attach per-item coupons with correct totals.

---

## Phase 9: Documentation + Release

1. Short owner guide under `docs/`: "Rental coupons — what FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT do and how to apply them on a transaction."
2. Update `E2E_TEST_PLAN.md` with the per-item coupon scenarios.
3. Update `README.md` feature list if present.
4. PR description links the PRD and lists every FR-4/FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Editing a rental transaction zeroes its prices (current bug) | High if unaddressed | High | Phase 3.1 preserves stored prices for `RentalId != nil` items; Phase 3.3 regression test asserts unchanged totals. Hard prerequisite, done before any UI ships. |
| Fixed 15K/30K over-discounts all-day or capped rentals (D1) | Medium | Low | Documented; staff only apply FREE 1/2 HOUR to standard hourly rentals. Open Question #1 confirms with owner. Duration note shown on the line. |
| Income/budget math regresses | Low | High | Discount always lands on `DiscountAmount`; `Subtotal = base − discount`; `Total = Σ subtotals`. Regression test on the no-coupon path. |
| A `transaction` coupon attached to a line (or vice versa) | Low | Medium | Calculator rejects wrong scope (Phase 2.2); UI offers only the matching scope per surface (D5). |
| Fixed coupon drives a negative subtotal | Low | Medium | Clamp to base in the calculator (D3). |
| Stacking accidentally allowed | Low | Low | ≤1 item-coupon per line enforced in usecase + UI (D4). |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Schema + seed | 0.5 day | 2 |
| 2 Domain + calculator | 0.5 day | 3 |
| 3 Rental-safe update + item application (core) | 1.5 days | 4 |
| 4 Data layer | 0.5 day | 5 |
| 5 Contract + codegen | 0.5 day | 6, 7 |
| 6 Coupon admin UI | 0.5 day | 7 |
| 7 Transaction edit UI | 1.5 days | 8 |
| 8 Mobile parity | 1 day | 9 |
| 9 Docs + release | 0.5 day | — |

**Total:** ~7 working days, single engineer. Each phase is one reviewable PR.
