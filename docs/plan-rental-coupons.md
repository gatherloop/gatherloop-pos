# Implementation Plan: Per-Item Coupons

Companion to [`prd-rental-coupons.md`](./prd-rental-coupons.md).

## Overview

Let an existing coupon target **one `TransactionItem`** instead of the whole transaction. That single capability covers all three requested coupons — they are ordinary `fixed`/`percentage` coupons, made "per-item" only by how staff attach them:

| Coupon | type | amount |
|---|---|---:|
| FREE 1 HOUR | `fixed` | 15,000 |
| FREE 2 HOUR | `fixed` | 30,000 |
| STUDENT DISCOUNT | `percentage` | 40 |

Coupons are attached **after checkout, on the transaction edit screen** (PRD D2). Rental checkout is unchanged. The discount lands on `TransactionItem.DiscountAmount`, so `Total = Σ subtotals` and the `PayTransaction` income/budget math is untouched.

**Design rules (from the PRD):**
- **No coupon "scope".** The coupon model is unchanged; placement (bill vs line) is decided by whether `transaction_item_id` is set. Staff choose. (D5)
- "Free N hours" = fixed rupiah, clamped to the base. (D1, D3)
- ≤ 1 coupon per line, no stacking. (D4)
- 2-hour minimum for FREE 1 HOUR is staff discretion, shown via the line's duration note. (D6)
- **Prerequisite — ✅ done on main (#131):** `UpdateTransactionById` preserves rental-item prices instead of re-deriving them from `variants.price = 0`. Phase 3 builds on it. (D7)
- All schema and contract changes additive. (D10)

Phases are independently shippable and ordered: schema/seed → domain → item-coupon application → data layer → contract → transaction edit UI → mobile → docs. Each phase is one small PR. **No coupon-admin work** — the three coupons are plain coupons the existing admin already creates.

---

## Phase 1: Database Schema + Seed

**Goal:** `transaction_coupons` can point at a line item; the three coupons exist. Existing data behaviorally identical. The `coupons` table is **not** touched.

### 1.1 Migration `000012_item_coupons`

`apps/api/migrations/000012_item_coupons.up.sql`:
```sql
ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);

INSERT INTO coupons (code, type, amount)
SELECT * FROM (
  SELECT 'FREE 1 HOUR'      AS code, 'fixed'      AS type, 15000 AS amount UNION ALL
  SELECT 'FREE 2 HOUR',           'fixed',            30000 UNION ALL
  SELECT 'STUDENT DISCOUNT',      'percentage',          40
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
```

### 1.2 Verify
- Up → down → up; seed does not duplicate on re-run.
- Existing `transaction_coupons` rows all read `transaction_item_id = NULL`.
- `go test ./apps/api/...` green (no Go reads the new column yet).

**Exit criteria:** Migration applies/reverts cleanly on a DB with existing coupons + transactions.

---

## Phase 2: Domain Entity + Discount Calculator

**Goal:** Add the item link to the junction entity + a pure discount helper with exhaustive tests. No usecase wiring yet.

### 2.1 Entity
- `apps/api/domain/transaction_entity.go`: add `TransactionItemId *int64` to `TransactionCoupon`.
- The `Coupon` entity is **unchanged** (no scope field).

### 2.2 Calculator

New `apps/api/domain/coupon_calculator.go` — pure, scope-free, implements the PRD application math / FR-4. The same helper serves both the whole-bill and per-line paths:
```go
func ApplyCouponToBase(base float32, coupon Coupon) (float32, *Error) {
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
`apps/api/domain/coupon_calculator_test.go` — table-driven over **every PRD FR-4 row 1–7**, plus: fixed exactly equal to base → discount = base, subtotal 0; percentage rounding boundary.

**Exit criteria:** Domain compiles; calculator tested in isolation. (No coupon-usecase validation change — the coupon model is untouched.)

---

## Phase 3: Item-Coupon Application (core PR)

**Goal:** A coupon attached to a line discounts that line — including rental tickets — on both create and update.

### 3.1 Rental-price preservation — ✅ DONE on main (#131)
`UpdateTransactionById` already preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of rental items and ships a regression test. **No work here** — but note its shape: rental items hit an early `if existingItem.RentalId != nil { … continue }` branch (`transaction_usecase.go`, ~:137-152) that copies stored values and skips the variant recompute. Phase 3.2 hooks coupons *into* that branch. (`CreateTransaction` never receives rental items, so it needed no preservation fix.)

### 3.2 Apply item-linked coupons
Refactor the coupon loop (`transaction.TransactionCoupons`) in **both** `CreateTransaction` and `UpdateTransactionById` (~:178-202) to use the shared `ApplyCouponToBase` helper:
- For each `TransactionCoupon`:
  - If `TransactionItemId == nil` → whole-bill: `discount = ApplyCouponToBase(Total, coupon)`, subtract from `Total` (same as today, now with the D3 clamp as a bonus).
  - If set → locate the target item in `transaction.TransactionItems`, derive its `base`, `discount = ApplyCouponToBase(base, coupon)`, set that item's `DiscountAmount = discount` and `Subtotal = base − discount`, adjust the running `Total` by the delta. Enforce ≤1 coupon per line (D4). **No scope check** — any coupon may target any line (D5).
- **Base derivation (matches #131):** rental item → `base = existingItem.Price * existingItem.Amount` (full duration-based price; recompute from `Price` each save so discounts never compound). Non-rental → `base = variant.Price * item.Amount`.
- **Rental-branch hook:** in `UpdateTransactionById`, when a rental item has an attached coupon, recompute its `DiscountAmount`/`Subtotal` from `Price` instead of blindly copying the stored `Subtotal`. A rental ticket with no coupon stays byte-for-byte as #131 leaves it.
- Snapshot `{type, amount, transaction_item_id}` into the `transaction_coupons` rows (the current loop drops `transaction_item_id` — add it).

### 3.3 Tests
Extend `transaction_usecase_test.go` (keep #131's rental-regression test):
- FREE 1 HOUR on a 30K **rental** item → DiscountAmount 15K, subtotal 15K, `RentalId` intact (rental-branch hook).
- Re-save the same transaction twice → discount stays 15K, does not compound (base-from-`Price`).
- FREE 2 HOUR on a 15K item → subtotal 0 (FR-4 #4, clamp).
- STUDENT on a 30K item → 17,500 (FR-4 #5).
- Multi-item: 3 items, STUDENT on the middle → only it discounted (FR-5).
- Whole-bill coupon (no `TransactionItemId`) still subtracts from `Total` as before.
- Coupon on a new transaction via `CreateTransaction` (non-rental path).

**Exit criteria:** Backend reproduces every FR-4/FR-5 case; a coupon on a rental ticket re-prices it without breaking #131's preservation guarantee.

---

## Phase 4: Data Layer (MySQL)

**Goal:** Repos map the new link.

- `apps/api/data/mysql/transaction_entity.go` (transaction_coupons model) + transformer: map nullable `transaction_item_id`. Ensure item-coupon rows persist/read the link, and `transaction_items.discount_amount`/`subtotal` round-trip.
- Round-trip test: create a transaction with a line-linked coupon → reload → discount + link intact.
- The coupon repository/transformer is **unchanged** (no scope).

**Exit criteria:** Repos persist/read the new field; existing tests untouched.

> Note: domain tests in Phases 2–3 mock the repositories, so the order (domain before data) is fine; this phase makes the core PR runnable end-to-end against MySQL.

---

## Phase 5: API Contract + Codegen

**Goal:** TS clients reflect the additive shape; both apps compile.

### 5.1 Edit `libs/api-contract/src/api.yaml`
- `TransactionCoupon` (in transaction request + response): add optional `transactionItemId`.
- **Coupon schemas unchanged.** All additive — no breaking changes; `POST /rentals/checkout` and the coupon endpoints untouched.

### 5.2 Codegen + verify
Run the project codegen (`libs/api-contract/package.json` / `openapitools.json`). `nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` green.

**Exit criteria:** Generated types include `transactionItemId`; existing flows compile unchanged.

---

## Phase 6: Transaction Edit Screen — Per-Line Coupon Picker

**Goal:** Staff attach a coupon to a specific line (PRD FR-6).

- The `libs/ui` transaction screen (`TransactionCreateScreen.tsx` and its update counterpart): each line item gains an "Apply coupon" control listing **all** coupons (reuse the `CouponList.tsx` sheet — no scope filter, D5).
- On select: show the line discount + new subtotal; recompute the grand total live; allow clearing; ≤1 per line.
- The existing whole-bill picker is unchanged.
- Show the rental duration note next to each rental line (D6).
- Form submits each line's optional `couponId`; map into `transactionCoupons[].transactionItemId` on save.

### Verify
`nx serve web` walkthrough: check out a 2h rental → open the transaction → apply FREE 1 HOUR → subtotal 15K; apply STUDENT to one of several tickets → only that line discounts (FR-5). `nx test web`.

**Exit criteria:** Every FR-4/FR-5 case reproduces in the web transaction edit UI; whole-bill coupon behavior unchanged.

---

## Phase 7: Mobile Parity

**Goal:** React Native transaction edit screen offers the same per-line picker (PRD FR-7).

- `apps/mobile/` transaction screen: per-line coupon picker reusing shared `libs/ui` primitives.
- `nx test mobile`; walk the same acceptance cases on emulator.

**Exit criteria:** Mobile staff can attach per-line coupons with correct totals.

---

## Phase 8: Documentation + Release

1. Short owner guide under `docs/`: "Rental coupons — what FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT do and how to apply them on a transaction."
2. Update `E2E_TEST_PLAN.md` with the per-line coupon scenarios.
3. Update `README.md` feature list if present.
4. PR description links the PRD and lists every FR-4/FR-5 case verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Editing a rental transaction zeroes its prices (was a live bug) | — | High | **Resolved on main (#131):** rental items keep stored price/subtotal on update, covered by a regression test. Phase 3.2's coupon hook must preserve this guarantee for the no-coupon case. |
| Fixed 15K/30K over-discounts all-day or capped rentals (D1) | Medium | Low | Documented; staff only apply FREE 1/2 HOUR to standard hourly rentals (D1, owner-confirmed). Duration note shown on the line. |
| Income/budget math regresses | Low | High | Discount always lands on `DiscountAmount`; `Subtotal = base − discount`; `Total = Σ subtotals`. Regression test on the no-coupon path. |
| Staff attach a coupon to the "wrong" place | Low | Low | Accepted by design — no scope guard (D5). Both pickers show all coupons; staff judgment, like the 2h-minimum and STUDENT-eligibility rules. |
| Fixed coupon drives a negative base | Low | Medium | Clamp to base in `ApplyCouponToBase` (D3) — now applied to the whole-bill path too. |
| Stacking accidentally allowed | Low | Low | ≤1 coupon per line enforced in usecase + UI (D4). |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Schema + seed | 0.5 day | 2 |
| 2 Domain + calculator | 0.5 day | 3 |
| 3 Item-coupon application (core; rental-safe update already done #131) | 1 day | 4 |
| 4 Data layer | 0.5 day | 5 |
| 5 Contract + codegen | 0.5 day | 6 |
| 6 Transaction edit UI | 1.5 days | 7 |
| 7 Mobile parity | 1 day | 8 |
| 8 Docs + release | 0.5 day | — |

**Total:** ~6 working days, single engineer (rental-safe update already shipped in #131; no coupon-admin work needed). Each phase is one reviewable PR.
