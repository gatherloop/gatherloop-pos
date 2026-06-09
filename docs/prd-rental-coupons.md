# PRD: Per-Item Coupons — Per-Ticket Discounts on Transactions

## Problem Statement

The cafe wants three new discounts for board-game **rentals**:

| Coupon | Rule |
|---|---|
| **FREE 1 HOUR** | Customer who plays ≥ 2 hours gets one hour's worth (Rp 15,000) off their ticket. |
| **FREE 2 HOUR** | Two hours' worth (Rp 30,000) off a ticket, no minimum. |
| **STUDENT DISCOUNT** | **40% off a single ticket** only. One checkout can contain several tickets; only the student's ticket is discounted. |

The current coupon system can't express these because **a coupon only discounts the whole transaction total**. Applying logic lives in `apps/api/domain/transaction_usecase.go:75-98` / `151-174`:

```go
transaction.Total -= float32(couponDiscountAmount)   // whole-bill only
```

A checkout of three rental tickets becomes one transaction with three line items (`TransactionItem`s). There is no way to land a discount on **one** of those items. "40% off *his* ticket only," when only some tickets qualify, is impossible.

### Why this is now an *item-scoped coupon* problem (not a checkout problem)

An earlier draft of this PRD modeled "free hours" as a special `free_duration` coupon applied during rental checkout (re-pricing the ticket at a reduced duration). We are **not** doing that. Two decisions (below) collapse the whole feature into a single, simpler idea:

1. **"Free N hours" is just a fixed-rupiah discount.** The cafe's hourly tier table adds Rp 15,000 per hour, so "1 free hour" = Rp 15,000 off and "2 free hours" = Rp 30,000 off. No duration math, no new coupon type. (See D1 for the edge cases this trades away.)
2. **Coupons are attached on the transaction, per item.** The student case is *already* a per-item discount; the free-hour cases become per-item `fixed` discounts. So the entire feature is: **let a coupon target one `TransactionItem` instead of the whole transaction.**

The transaction stays the single source of truth for money. No second application path, no rental-specific coupon type, no duration leaking into the coupon layer.

---

## Context: Existing System

- **Backend**: Go REST API, MySQL + GORM, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations/` (next free number **000012**).
- **Frontend**: Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI library (`libs/ui/`). React Query + Zod + React Hook Form.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`, codegen consumed by both frontends.

### Coupon domain today

- **Entity** (`apps/api/domain/coupon_entity.go`): `Coupon { Id, Code, Type CouponType (fixed|percentage), Amount int64, ... }`.
- **Schema** (`apps/api/migrations/000001_initial_schema.up.sql:65-74`): `coupons(id, code, type, amount, created_at, deleted_at)`, `UNIQUE(code)`.
- **Junction** (same file): `transaction_coupons(id, transaction_id, coupon_id, type, amount)` — snapshots the coupon's type/amount at apply time so later edits don't rewrite history.
- **Application math** (`transaction_usecase.go:82-90`): `fixed` subtracts `amount`; `percentage` subtracts `RoundToNearest500(total * amount / 100)`. Both subtract from `transaction.Total`.
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

One new dimension on coupons, plus a ticket link on the junction, plus a rental-safe update path, plus per-item coupon UI on the transaction edit screen.

### 1. Coupon **scope**

A new `scope` field on `coupons`:

| Scope | Meaning |
|---|---|
| `transaction` | Whole-bill discount (today's behavior; the default). |
| `item` | Discount one `TransactionItem` (one rental ticket). |

`scope` defaults to `transaction`, so every existing coupon is unchanged.

### 2. The three coupons, in the model

| Coupon | `type` | `amount` | `scope` |
|---|---|---:|---|
| FREE 1 HOUR | `fixed` | 15,000 | `item` |
| FREE 2 HOUR | `fixed` | 30,000 | `item` |
| STUDENT DISCOUNT | `percentage` | 40 | `item` |

No new `type`. `fixed` and `percentage` are all we need.

### 3. Per-item application math

When a coupon is attached to a specific item, its discount is computed against **that item's pre-discount subtotal** (`base = price × amount`) and stored on that item:

```
fixed:      discount = min(amount, base)                    // never negative
percentage: discount = RoundToNearest500(base × amount / 100)

item.DiscountAmount = discount
item.Subtotal       = base − discount
transaction.Total   = Σ item.Subtotal  − (transaction-scope coupon discounts)
```

Because the discount lands on `Subtotal` and `Total` is the sum of subtotals, the existing income/budget math in `PayTransaction` is untouched.

### 4. Attach coupons on the transaction edit screen

The transaction edit screen already has a whole-bill coupon picker. It gains a **per-item** coupon picker: each line item can have at most one `item`-scoped coupon attached, showing the resulting discount and new subtotal, with the grand total updating live. The whole-bill picker continues to offer only `transaction`-scoped coupons.

For a rental: staff checks out as today → opens the resulting transaction → attaches FREE 1 HOUR / STUDENT DISCOUNT to the relevant ticket(s) → saves.

---

## Confirmed Product Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | "Free N hours" model | **Fixed rupiah** (15K / 30K), item-scoped, clamped to the ticket price. **Not** duration re-pricing. | The hourly table adds 15K/hour, so a fixed amount is *exact* for standard 2–6h hourly rentals and keeps the model to two coupon types. **Trade-off:** it over-discounts on all-day passes (a flat day rate where a "free hour" is really worth 0) and past the tier cap (where a removed hour saves < 15K). **Confirmed by the owner:** this is a staff-controlled rule — staff do not apply FREE 1/2 HOUR to all-day or capped rentals. The system does not block it. |
| D2 | Where coupons attach | **On the transaction edit screen, after checkout.** Rental checkout is unchanged. | Reuses the existing coupon UI and the transaction as the single coupon authority. No checkout-endpoint change, no second application path. |
| D3 | Fixed > item price | **Clamp to the item subtotal** (discount never exceeds base; subtotal floors at 0). | FREE 2 HOUR (30K) on a 1-hour ticket (15K) → ticket is free, not negative. Gives "short rental fully covered" for free. |
| D4 | Coupons per item | **At most one `item` coupon per line item** in v1 (no stacking). | Keeps math and UI simple; covers all three target coupons. |
| D5 | Scope enforcement | An `item` coupon can only be attached to a line item; a `transaction` coupon only to the whole bill. The server validates scope on both paths. | Each scope is offered only where it makes sense. |
| D6 | 2-hour minimum for FREE 1 HOUR | **Staff discretion. Confirmed by the owner.** Not auto-enforced. | After checkout, the transaction item carries duration only as a display note (`"2 hour(s)"`), not structured minutes — there's nothing reliable to gate on. The duration note is shown on the line so staff can judge. Auto-enforcement is a future enhancement (carry played-minutes onto the item). |
| D7 | Rental-item price preservation | **Done on main (#131).** `UpdateTransactionById` preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of items with `RentalId != nil` instead of recomputing from `variants.price` (0 for rentals). The item-coupon work (FR-3) extends this same branch. | Was a hard prerequisite for editing rental transactions; the old path silently zeroed rental prices. |
| D8 | Reusability / limits | Coupons stay reusable rules; no usage limits, single-use codes, or expiry introduced here. Two students in one checkout each attach STUDENT DISCOUNT to their own ticket. | Matches today's coupon semantics. |
| D9 | Percentage rounding | Reuse `RoundToNearest500` for item-scoped percentage discounts, same as transaction scope today. | Consistency with existing IDR rounding. |
| D10 | Backward compatibility | `coupons.scope` defaults to `'transaction'`; `transaction_coupons.transaction_item_id` is nullable (null = whole-transaction). OpenAPI changes are additive. | No existing coupon, transaction, or consumer changes. |
| D11 | STUDENT DISCOUNT eligibility | **Board-game rentals only, staff-enforced.** No system restriction on which line type can take an `item` coupon. | The item-scope mechanism is intentionally generic; limiting STUDENT to rental tickets is a usage rule staff apply, keeping the model simple and reusable for future per-item discounts. |
| D12 | Coupon code format | **Free text**, unique (existing `UNIQUE(code)`). No slug/normalization rule. | Owner enters human-readable codes directly; no added validation. |

---

## Feature Requirements

### FR-1: Extended Coupon Model

`coupons` gains `scope VARCHAR(50) NOT NULL DEFAULT 'transaction'` (`transaction` | `item`). Type set is unchanged (`fixed`, `percentage`).

Coupon create/update validation:
- `scope ∈ {transaction, item}`.
- `percentage` ⇒ `0 < amount ≤ 100`; `fixed` ⇒ `amount > 0`.

### FR-2: Rental-Safe Transaction Update — ✅ DONE (#131)

`UpdateTransactionById` (`transaction_usecase.go`) preserves the stored `Price`/`Subtotal`/`DiscountAmount`/`RentalId`/`Note` of any item with `RentalId != nil` instead of re-deriving from `variant.Price`, with a regression test asserting an edit+resave leaves rental line prices and total unchanged. (`CreateTransaction` never receives rental items — rentals enter only via `CheckoutRentals` → `repository.CreateTransaction`, not the create usecase — so no change was needed there.) **No further work; FR-3 builds on this.**

### FR-3: Item-Scoped Coupon Application

`transaction_coupons` gains a nullable `transaction_item_id`. When a coupon row carries one:
- The coupon must be `item`-scoped (else 400).
- Its discount is computed per §3 against that item's `base` and written to `item.DiscountAmount`; `item.Subtotal = base − discount`.
- **Base derivation:** for a **rental** item (`RentalId != nil`) `base` is the stored full `Price × Amount` (pre-discount; the discount is recomputed from `Price` each save so it never compounds). For a non-rental item `base = variant.Price × Amount`, matching the existing line math.
- **Integration with #131:** the rental branch of `UpdateTransactionById` currently copies the stored `Subtotal`/`DiscountAmount` and `continue`s. Item-coupon application must hook into that branch so a coupon attached to a rental ticket actually re-prices its `DiscountAmount`/`Subtotal` (and the running `Total`), while a rental ticket with *no* item-coupon stays exactly as #131 leaves it. Item-scope must also be applied in `CreateTransaction`'s coupon loop for new (non-rental) transactions.

Transaction-scope coupons (no `transaction_item_id`) behave exactly as today, subtracting from `Total` after item subtotals are summed.

### FR-4: Discount Calculator (Acceptance Tests)

A pure function computes one item's discount from `(base, coupon)`:

| # | Coupon | Item base | Discount | Subtotal |
|---|---|---:|---:|---:|
| 1 | FREE 1 HOUR (`fixed 15000`) | 30,000 | 15,000 | 15,000 |
| 2 | FREE 1 HOUR (`fixed 15000`) | 45,000 | 15,000 | 30,000 |
| 3 | FREE 2 HOUR (`fixed 30000`) | 45,000 | 30,000 | 15,000 |
| 4 | FREE 2 HOUR (`fixed 30000`) | 15,000 | 15,000 (clamped, D3) | 0 |
| 5 | STUDENT (`percentage 40`) | 30,000 | 12,500 (`round500(30000×40/100)`) | 17,500 |
| 6 | STUDENT (`percentage 40`) | 20,000 | 8,000 | 12,000 |
| 7 | (none) | 30,000 | 0 | 30,000 |

### FR-5: Multi-Ticket Behavior

A transaction with three rental tickets where only ticket B has STUDENT DISCOUNT: A and C keep full price; B is 40%-off; `Total = A + round(0.6×B) + C`. Works by construction because the discount is per-`TransactionItem`. This is the requirement's "not all tickets can use STUDENT DISCOUNT" case.

### FR-6: Coupon Admin UI

The coupon create/edit form gains a **scope** selector (`transaction` / `item`). The amount label adapts ("Amount (Rp)" for fixed, "Percent (%)" for percentage). Zod mirrors FR-1. The owner can thereby create FREE 1 HOUR, FREE 2 HOUR, STUDENT DISCOUNT.

### FR-7: Transaction Edit Screen — Per-Item Coupon Picker

On the transaction create/edit screen:
- Each line item gains an "Apply coupon" control listing only `item`-scoped coupons.
- Selecting one shows the discount and the new subtotal for that line; the grand total updates live. At most one item-coupon per line (D4); allow clearing.
- The existing whole-bill picker is filtered to `transaction`-scoped coupons.
- For rental items, the duration note (e.g. "2 hour(s)") is shown next to the line so staff can apply the 2-hour-minimum rule by eye (D6).
- The submitted form carries each line's optional attached `couponId`.

### FR-8: Mobile Parity

The React Native transaction edit screen offers the same per-item coupon picker, reusing shared `libs/ui` primitives. Coupon **admin** editing may stay web-only for v1.

---

## Data Model Changes

### Altered: `coupons`
```sql
ALTER TABLE coupons
  ADD COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'transaction';
```

### Altered: `transaction_coupons`
```sql
ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);
```
`null` ⇒ whole-transaction coupon (today's rows). Non-null ⇒ the discounted ticket.

### Unchanged
`transaction_items.discount_amount` already stores per-item discounts. No change to `transactions`, `rentals`, `pricing_tiers`, or `variants`.

### Seed (FR-2 of the plan)
```sql
INSERT INTO coupons (code, type, amount, scope) VALUES
  ('FREE 1 HOUR',      'fixed',      15000, 'item'),
  ('FREE 2 HOUR',      'fixed',      30000, 'item'),
  ('STUDENT DISCOUNT', 'percentage',    40, 'item');
```
Idempotent on `code`.

---

## API Changes (all additive)

| Method | Path | Change |
|---|---|---|
| `POST /coupons`, `PUT /coupons/{id}` | Request/response gain `scope`. |
| `GET /coupons`, `GET /coupons/{id}` | Response gains `scope`. |
| `POST /transactions`, `PUT /transactions/{id}` | Each transaction-coupon entry may carry an optional `transactionItemId`. Rental-item prices are preserved server-side (FR-2). |
| `GET /transactions/{id}` | `transaction_coupons` entries gain optional `transactionItemId`. |

Rental checkout (`POST /rentals/checkout`) is **unchanged**. OpenAPI edits in `libs/api-contract/src/api.yaml`; codegen regenerates TS clients. No breaking changes.

---

## Out of Scope

- **Coupon stacking** (more than one coupon per item, or per-item + whole-bill on the same line). D4.
- **Duration-accurate free-hour pricing** (re-pricing through the tier table for all-day/capped rentals). Explicitly traded away in D1.
- **Auto-enforcing the 2-hour minimum.** Staff discretion in v1 (D6); a follow-up could carry structured played-minutes onto items.
- **Auto-applying coupons** at checkout. Staff attach manually on the transaction.
- **Usage limits / single-use codes / expiry.** Coupons remain reusable rules.
- **Discounts on purchase (non-rental) items** beyond what item-scope already allows — the feature is generic but targeted at rental tickets in v1.

---

## Resolved

- **All-day / capped rentals + FREE 1 HOUR**: the owner confirms this is **staff-controlled** — staff don't apply FREE 1/2 HOUR to all-day or capped rentals, and the 2-hour minimum is enforced by staff judgment. The system stays simple and does not block either case. (See D1, D6.)
- **STUDENT DISCOUNT eligibility**: applies to **board-game rentals only**, enforced by **staff judgment** — staff attach it only to a rental ticket, not to food/drink lines. The item-scope mechanism is generic (any line item *could* take it), so no system restriction is added; this is a usage rule, not a constraint. (See D5, D11.)
- **Coupon codes are free text.** No slug/format rule. Codes remain unique (existing `UNIQUE(code)` constraint) and user-entered as-is (e.g. `FREE 1 HOUR`, `STUDENT DISCOUNT`). (See D12.)

## Open Questions

_None outstanding. The PRD is ready to build against._
