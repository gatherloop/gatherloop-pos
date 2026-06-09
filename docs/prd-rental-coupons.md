# PRD: Per-Item Coupons — Per-Ticket Discounts on Transactions

## Problem Statement

The cafe wants three new discounts for board-game **rentals**:

| Coupon | Rule |
|---|---|
| **FREE 1 HOUR** | Customer who plays ≥ 2 hours gets one hour's worth (Rp 15,000) off their ticket. |
| **FREE 2 HOUR** | Two hours' worth (Rp 30,000) off a ticket, no minimum. |
| **STUDENT DISCOUNT** | **40% off a single ticket** only. One checkout can contain several tickets; only the student's ticket is discounted. |

The current coupon system can't express these because **a coupon only discounts the whole transaction total**. Applying logic lives in `apps/api/domain/transaction_usecase.go`:

```go
transaction.Total -= float32(couponDiscountAmount)   // whole-bill only
```

A checkout of three rental tickets becomes one transaction with three line items (`TransactionItem`s). There is no way to land a discount on **one** of those items. "40% off *his* ticket only," when only some tickets qualify, is impossible.

### The whole feature, in one sentence

An earlier draft modeled "free hours" as a special `free_duration` coupon applied during rental checkout. We are **not** doing that. Two decisions collapse the feature into one idea:

1. **"Free N hours" is just a fixed-rupiah discount.** The hourly tier table adds Rp 15,000 per hour, so "1 free hour" = Rp 15,000 off, "2 free hours" = Rp 30,000 off. No duration math, no new coupon type. (D1 covers the edge cases this trades away.)
2. **A coupon can be attached to one `TransactionItem`, not just the whole transaction.** The student case is *already* a per-item discount; the free-hour cases become per-item `fixed` discounts.

So the entire feature is: **let an existing coupon target one line item instead of the whole bill.** No new coupon attribute, no new coupon type, no second application path. The transaction stays the single source of truth for money.

### Why there is **no coupon "scope"** (a deliberate non-decision)

A coupon is just a `{type, amount}` rule. *Where* it applies — whole bill or one line — is decided when staff **attach** it (by setting `transaction_item_id` or not), not by a property on the coupon. The math is identical either way: `fixed` subtracts its amount; `percentage` subtracts a rounded % of whatever base it lands on (the bill total, or the line subtotal). So the same coupon can legitimately be used either place, and **staff choose the placement.** We considered a `scope` flag to restrict this and rejected it — see D5.

---

## Context: Existing System

- **Backend**: Go REST API, MySQL + GORM, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations/` (next free number **000012**).
- **Frontend**: Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI library (`libs/ui/`). React Query + Zod + React Hook Form.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`, codegen consumed by both frontends.

### Coupon domain today

- **Entity** (`apps/api/domain/coupon_entity.go`): `Coupon { Id, Code, Type CouponType (fixed|percentage), Amount int64, ... }`. **This entity does not change.**
- **Schema** (`apps/api/migrations/000001_initial_schema.up.sql:65-74`): `coupons(id, code, type, amount, created_at, deleted_at)`, `UNIQUE(code)`. **Unchanged.**
- **Junction** (same file): `transaction_coupons(id, transaction_id, coupon_id, type, amount)` — snapshots the coupon's type/amount at apply time so later edits don't rewrite history. **Gains one nullable column** (`transaction_item_id`).
- **Application math** (`transaction_usecase.go`): `fixed` subtracts `amount`; `percentage` subtracts `RoundToNearest500(total * amount / 100)`. Both subtract from `transaction.Total`.
- **Frontend**: `libs/ui/src/domain/entities/Coupon.ts`; a coupon picker bottom-sheet `CouponList.tsx`, used in the transaction create/edit screens.

### Transaction items already support a discount

`TransactionItem.DiscountAmount` exists (`apps/api/domain/transaction_entity.go:14`; column `transaction_items.discount_amount`) and already flows into `Subtotal = (price × amount) − DiscountAmount`. **Per-item discounts have a home in the data model already** — there is just no coupon that targets it.

### The rental flow stays untouched

Rental checkout (`apps/api/domain/rental_usecase.go:83-155`) computes each ticket's price from the tier snapshot and creates a plain transaction. **This PRD changes nothing here.** Coupons are added afterward by editing the resulting transaction.

### ✅ The blocker for "edit the transaction afterward" — RESOLVED on main (#131)

The transaction **update** path used to recompute every item's price from the variant (`variants.price = 0` for rentals), so saving a rental transaction zeroed its prices. **This is now fixed on `main` by [#131](../../pull/131)** (`fix: preserve rental item pricing on transaction update`): `UpdateTransactionById` indexes the existing items and, for any item with `RentalId != nil`, **preserves the checkout-calculated `Price`, `Subtotal`, `DiscountAmount`, `RentalId`, and `Note`** instead of re-deriving them, then `continue`s past the variant recompute.

Two consequences for this feature:
- **The prerequisite is done.** FR-2 / D7 below are satisfied upstream; this PRD builds on them.
- **A rental line is now treated as immutable on update.** It copies the stored `Subtotal`/`DiscountAmount` and skips the recompute branch. So to *attach a coupon to a rental ticket*, the item-coupon logic (FR-3) must **extend that rental branch**: compute the discount against the stored full `Price` (the pre-discount base, since at checkout `Subtotal == Price` and `DiscountAmount == 0`) and write the new `DiscountAmount`/`Subtotal` — recomputing from `Price` each save so the discount never compounds across edits.

---

## Proposed Solution

Three pieces, no coupon-model change:

1. **Link** — `transaction_coupons` gains a nullable `transaction_item_id`. Null = whole-bill coupon (today's behavior). Non-null = the line item the coupon discounts.
2. **Apply** — when a coupon row carries a `transaction_item_id`, its discount is computed against that line's base and folded into the line's `DiscountAmount`/`Subtotal`. Otherwise it subtracts from `Total` as today.
3. **UI** — the transaction edit screen gains a per-line "Apply coupon" control alongside the existing whole-bill picker.

### The three coupons, in the model

| Coupon | `type` | `amount` |
|---|---|---:|
| FREE 1 HOUR | `fixed` | 15,000 |
| FREE 2 HOUR | `fixed` | 30,000 |
| STUDENT DISCOUNT | `percentage` | 40 |

Plain `fixed`/`percentage` coupons — creatable in the existing coupon admin with **no UI change**. They become "per-item" only by how staff attach them.

### Application math

When a coupon is attached to a line item, its discount is computed against **that line's pre-discount subtotal** (`base = price × amount`) and stored on the line:

```
fixed:      discount = min(amount, base)                    // clamp, never negative (D3)
percentage: discount = RoundToNearest500(base × amount / 100)

item.DiscountAmount = discount
item.Subtotal       = base − discount
transaction.Total   = Σ item.Subtotal  − (whole-bill coupon discounts)
```

The same `fixed`/`percentage` formula already runs for whole-bill coupons against `Total`; the only new thing is running it against a line base. A single shared helper `ApplyCouponToBase(base, coupon)` should serve both paths (and applying the clamp to the bill path too is a small bonus fix). Because the discount lands on `Subtotal` and `Total` is the sum of subtotals, the existing income/budget math in `PayTransaction` is untouched.

### Attach coupons on the transaction edit screen

The transaction edit screen already has a whole-bill coupon picker. It gains a **per-line** "Apply coupon" control: each line item can have at most one coupon attached (D4), showing the resulting discount and new subtotal, with the grand total updating live. Both pickers offer **all** coupons — staff pick the right one for the placement (D5).

For a rental: staff checks out as today → opens the resulting transaction → attaches FREE 1 HOUR / STUDENT DISCOUNT to the relevant ticket(s) → saves.

---

## Confirmed Product Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | "Free N hours" model | **Fixed rupiah** (15K / 30K), applied to a line, clamped to the ticket price. **Not** duration re-pricing. | The hourly table adds 15K/hour, so a fixed amount is *exact* for standard 2–6h hourly rentals and keeps the model to two coupon types. **Trade-off:** it over-discounts on all-day passes (flat day rate where a "free hour" is worth 0) and past the tier cap. **Confirmed by the owner:** staff-controlled — staff don't apply FREE 1/2 HOUR to all-day or capped rentals. The system does not block it. |
| D2 | Where coupons attach | **On the transaction edit screen, after checkout.** Rental checkout is unchanged. | Reuses the existing coupon UI and the transaction as the single coupon authority. No checkout-endpoint change, no second application path. |
| D3 | Fixed > base | **Clamp to the base** the coupon is applied against (discount never exceeds base; subtotal/total floors at 0). | FREE 2 HOUR (30K) on a 1-hour ticket (15K) → ticket is free, not negative. Applies to both line and whole-bill placement. |
| D4 | Coupons per line | **At most one coupon per line item** in v1 (no stacking). | Keeps math and UI simple; covers all three target coupons. |
| D5 | **No coupon "scope"** | **Any coupon can be attached either to the whole bill or to a line item; staff choose the placement.** No `scope` flag, no server restriction, no picker filtering. | The math is well-defined for both placements regardless of any flag, so `scope` would be pure guardrail + UI filter. The owner is happy to let staff decide placement (consistent with D6/D11). Removing it deletes a column, a migration, the coupon-admin form change, and a validation rule — with no correctness or data-integrity cost. The only trade-off: the server won't stop a "wrong" placement (e.g. FREE 2 HOUR on the whole bill) — that's now staff judgment. |
| D6 | 2-hour minimum for FREE 1 HOUR | **Staff discretion. Confirmed by the owner.** Not auto-enforced. | After checkout, the line carries duration only as a display note (`"2 hour(s)"`), not structured minutes — nothing reliable to gate on. The note is shown on the line so staff can judge. Auto-enforcement is a future enhancement. |
| D7 | Rental-item price preservation | **Done on main (#131).** `UpdateTransactionById` preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of items with `RentalId != nil` instead of recomputing from `variants.price` (0 for rentals). The item-coupon work (FR-3) extends this same branch. | Was a hard prerequisite for editing rental transactions; the old path silently zeroed rental prices. |
| D8 | Reusability / limits | Coupons stay reusable rules; no usage limits, single-use codes, or expiry. Two students in one checkout each attach STUDENT DISCOUNT to their own ticket. | Matches today's coupon semantics. |
| D9 | Percentage rounding | Reuse `RoundToNearest500` for line discounts, same as the bill path today. | Consistency with existing IDR rounding. |
| D10 | Backward compatibility | Coupons table is **unchanged**. `transaction_coupons.transaction_item_id` is nullable (null = whole-transaction, today's rows). OpenAPI changes are additive. | No existing coupon, transaction, or consumer changes. |
| D11 | STUDENT DISCOUNT eligibility | **Board-game rentals only, staff-enforced.** No system restriction on which line a coupon can target. | The mechanism is generic; limiting STUDENT to rental tickets is a usage rule staff apply, keeping the model simple and reusable for future per-item discounts. |
| D12 | Coupon code format | **Free text**, unique (existing `UNIQUE(code)`). No slug/normalization rule. | Owner enters human-readable codes directly; no added validation. |

---

## Feature Requirements

### FR-1: Coupon Model — Unchanged

No change to the `coupons` table, the `Coupon` entity, coupon validation, the coupon admin UI, or the coupon API. FREE 1 HOUR / FREE 2 HOUR / STUDENT DISCOUNT are ordinary `fixed`/`percentage` coupons the current admin already creates. (Existing validation stays: `percentage` ⇒ `0 < amount ≤ 100`; `fixed` ⇒ `amount > 0`.)

### FR-2: Rental-Safe Transaction Update — ✅ DONE (#131)

`UpdateTransactionById` preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of any item with `RentalId != nil` instead of re-deriving from `variant.Price`, with a regression test asserting an edit+resave leaves rental line prices and total unchanged. (`CreateTransaction` never receives rental items — they enter only via `CheckoutRentals` → `repository.CreateTransaction` — so no change was needed there.) **No further work; FR-3 builds on this.**

### FR-3: Item-Linked Coupon Application

`transaction_coupons` gains a nullable `transaction_item_id`. When a coupon row carries one:
- Its discount is computed (per the application math) against that line's `base` and written to `item.DiscountAmount`; `item.Subtotal = base − discount`. No scope check — any coupon may target any line (D5).
- **Base derivation:** for a **rental** item (`RentalId != nil`) `base` is the stored full `Price × Amount` (pre-discount; recomputed from `Price` each save so it never compounds). For a non-rental item `base = variant.Price × Amount`, matching the existing line math.
- **Integration with #131:** the rental branch of `UpdateTransactionById` currently copies the stored `Subtotal`/`DiscountAmount` and `continue`s. Item-coupon application must hook into that branch so a coupon attached to a rental ticket actually re-prices its `DiscountAmount`/`Subtotal` (and the running `Total`), while a rental ticket with *no* attached coupon stays exactly as #131 leaves it. The same item-linked logic also applies in `CreateTransaction`'s coupon loop for new (non-rental) transactions.

Whole-bill coupons (no `transaction_item_id`) behave exactly as today, subtracting from `Total` after item subtotals are summed.

### FR-4: Discount Calculator (Acceptance Tests)

The shared `ApplyCouponToBase(base, coupon)` helper computes the discount:

| # | Coupon | Base | Discount | Subtotal |
|---|---|---:|---:|---:|
| 1 | FREE 1 HOUR (`fixed 15000`) | 30,000 | 15,000 | 15,000 |
| 2 | FREE 1 HOUR (`fixed 15000`) | 45,000 | 15,000 | 30,000 |
| 3 | FREE 2 HOUR (`fixed 30000`) | 45,000 | 30,000 | 15,000 |
| 4 | FREE 2 HOUR (`fixed 30000`) | 15,000 | 15,000 (clamped, D3) | 0 |
| 5 | STUDENT (`percentage 40`) | 30,000 | 12,500 (`round500(30000×40/100)`) | 17,500 |
| 6 | STUDENT (`percentage 40`) | 20,000 | 8,000 | 12,000 |
| 7 | (none) | 30,000 | 0 | 30,000 |

### FR-5: Multi-Ticket Behavior

A transaction with three rental tickets where only ticket B has STUDENT DISCOUNT attached: A and C keep full price; B is 40%-off; `Total = A + round(0.6×B) + C`. Works by construction because the discount is per-`TransactionItem`. This is the requirement's "not all tickets can use STUDENT DISCOUNT" case.

### FR-6: Transaction Edit Screen — Per-Line Coupon Picker

On the transaction create/edit screen:
- Each line item gains an "Apply coupon" control listing **all** coupons (no filtering — D5).
- Selecting one shows the discount and the new subtotal for that line; the grand total updates live. At most one coupon per line (D4); allow clearing.
- The existing whole-bill picker is unchanged and continues to offer all coupons.
- For rental items, the duration note (e.g. "2 hour(s)") is shown next to the line so staff can apply the 2-hour-minimum rule by eye (D6).
- The submitted form carries each line's optional attached `couponId`, mapped to `transactionCoupons[].transactionItemId` on save.

### FR-7: Mobile Parity

The React Native transaction edit screen offers the same per-line coupon picker, reusing shared `libs/ui` primitives.

---

## Data Model Changes

### Altered: `transaction_coupons`
```sql
ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);
```
`null` ⇒ whole-transaction coupon (today's rows). Non-null ⇒ the discounted line item.

### Unchanged
`coupons` and `transaction_items` are untouched (the latter already stores per-item discounts). No change to `transactions`, `rentals`, `pricing_tiers`, or `variants`.

### Seed
```sql
INSERT INTO coupons (code, type, amount) VALUES
  ('FREE 1 HOUR',      'fixed',      15000),
  ('FREE 2 HOUR',      'fixed',      30000),
  ('STUDENT DISCOUNT', 'percentage',    40);
```
Idempotent on `code`. (Could equally be created by the owner in the existing admin UI; seeding just guarantees they exist.)

---

## API Changes (all additive)

| Method | Path | Change |
|---|---|---|
| `POST /transactions`, `PUT /transactions/{id}` | Each transaction-coupon entry may carry an optional `transactionItemId`. Rental-item prices are preserved server-side (FR-2). |
| `GET /transactions/{id}` | `transaction_coupons` entries gain optional `transactionItemId`. |

**Coupon endpoints are unchanged.** Rental checkout (`POST /rentals/checkout`) is unchanged. OpenAPI edits in `libs/api-contract/src/api.yaml`; codegen regenerates TS clients. No breaking changes.

---

## Out of Scope

- **Coupon stacking** (more than one coupon per line, or per-line + whole-bill on the same line). D4.
- **Coupon "scope" / placement restrictions.** Deliberately rejected — D5.
- **Duration-accurate free-hour pricing** (re-pricing through the tier table for all-day/capped rentals). Traded away in D1.
- **Auto-enforcing the 2-hour minimum.** Staff discretion in v1 (D6); a follow-up could carry structured played-minutes onto items.
- **Auto-applying coupons** at checkout. Staff attach manually on the transaction.
- **Usage limits / single-use codes / expiry.** Coupons remain reusable rules.

---

## Resolved

- **All-day / capped rentals + FREE 1 HOUR**: staff-controlled — staff don't apply FREE 1/2 HOUR to all-day or capped rentals; the 2-hour minimum is staff judgment. (D1, D6.)
- **STUDENT DISCOUNT eligibility**: board-game rentals only, by staff judgment — no system restriction. (D11.)
- **Coupon "scope"**: dropped. Any coupon applies at either level; staff choose placement. (D5.)
- **Coupon codes**: free text, unique. (D12.)

## Open Questions

_None outstanding. The PRD is ready to build against._
