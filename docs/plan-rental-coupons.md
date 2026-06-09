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
- **Prerequisite — ✅ done on main (#131):** `UpdateTransactionById` now preserves rental-item prices instead of re-deriving them from `variants.price = 0`. Phase 3 builds on it. (D7)
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

## Phase 3: Item-Coupon Application (core PR)

**Goal:** Item-scoped coupons discount the right line — including rental tickets — on both create and update.

### 3.1 Rental-price preservation — ✅ DONE on main (#131)
`UpdateTransactionById` already preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of rental items and ships a regression test. **No work here** — but note its shape: rental items hit an early `if existingItem.RentalId != nil { … continue }` branch (`transaction_usecase.go`, ~:137-152) that copies stored values and skips the variant recompute. Phase 3.2 hooks coupons *into* that branch. (`CreateTransaction` never receives rental items, so it needed no preservation fix.)

### 3.2 Apply item-scoped coupons
Update the coupon loop (`transaction.TransactionCoupons`) in **both** `CreateTransaction` and `UpdateTransactionById` (~:178-202):
- For each `TransactionCoupon`:
  - If `TransactionItemId == nil` → transaction-scope: subtract from `Total` exactly as today.
  - If set → locate the target item in `transaction.TransactionItems`, derive its `base`, call `CalculateItemDiscount(base, coupon)`, set that item's `DiscountAmount = discount` and `Subtotal = base − discount`, adjust the running `Total` by the delta. Enforce ≤1 item-coupon per line (D4); reject a non-`item` coupon carrying a `TransactionItemId` (D5, 400).
- **Base derivation (matches #131):** rental item → `base = existingItem.Price * existingItem.Amount` (full duration-based price; recompute from `Price` each save so discounts never compound). Non-rental → `base = variant.Price * item.Amount`.
- **Rental-branch hook:** in `UpdateTransactionById`, when a rental item has an attached item-coupon, recompute its `DiscountAmount`/`Subtotal` from `Price` instead of blindly copying the stored `Subtotal`. A rental ticket with no item-coupon stays byte-for-byte as #131 leaves it.
- Snapshot `{type, amount, transaction_item_id}` into the `transaction_coupons` rows (the current loop drops `transaction_item_id` — add it).

### 3.3 Tests
Extend `transaction_usecase_test.go` (keep #131's rental-regression test):
- FREE 1 HOUR on a 30K **rental** item → DiscountAmount 15K, subtotal 15K, `RentalId` intact (rental-branch hook).
- Re-save the same transaction twice → discount stays 15K, does not compound (base-from-`Price`).
- FREE 2 HOUR on a 15K item → subtotal 0 (FR-4 #4, clamp).
- STUDENT on a 30K item → 17,500 (FR-4 #5).
- Multi-item: 3 items, STUDENT on the middle → only it discounted (FR-5).
- `transaction`-scope coupon carrying a `TransactionItemId` → 400 (D5).
- Item-coupon on a new transaction via `CreateTransaction` (non-rental path).

**Exit criteria:** Backend reproduces every FR-4/FR-5 case; a coupon on a rental ticket re-prices it without breaking #131's preservation guarantee.

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
| Editing a rental transaction zeroes its prices (was a live bug) | — | High | **Resolved on main (#131):** rental items keep stored price/subtotal on update, covered by a regression test. Phase 3.2's coupon hook must preserve this guarantee for the no-coupon case. |
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
| 3 Item-coupon application (core; rental-safe update already done #131) | 1 day | 4 |
| 4 Data layer | 0.5 day | 5 |
| 5 Contract + codegen | 0.5 day | 6, 7 |
| 6 Coupon admin UI | 0.5 day | 7 |
| 7 Transaction edit UI | 1.5 days | 8 |
| 8 Mobile parity | 1 day | 9 |
| 9 Docs + release | 0.5 day | — |

**Total:** ~6.5 working days, single engineer (the rental-safe update prerequisite already shipped in #131). Each phase is one reviewable PR.
