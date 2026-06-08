# PRD: Rental Coupons — Time-Aware & Per-Ticket Discounts

## Problem Statement

The cafe wants to run three new coupons for board-game **rentals**:

| Coupon | Rule |
|---|---|
| **FREE 1 HOUR** | Customer plays at least **2 hours** → bill **1 hour less**. |
| **FREE 2 HOUR** | No minimum play time → bill **2 hours less**. |
| **STUDENT DISCOUNT** | **40% off a single ticket** only. One checkout can contain several tickets; only the student's ticket is discounted, not the whole bill. |

The current coupon system cannot express any of these:

1. **No play-time context.** Coupons are only applied inside `CreateTransaction` / `UpdateTransactionById` (`apps/api/domain/transaction_usecase.go:75-98`), i.e. the manual transaction-create screen. The **rental checkout** path (`apps/api/domain/rental_usecase.go:83-155`) builds its transaction directly and **never applies any coupon**. Yet rental duration — the thing "FREE 1 HOUR" depends on — only exists at checkout, computed from `checkout_at − checkin_at`. So a time-conditional coupon is impossible today.

2. **No per-ticket scope.** A coupon discounts the **whole transaction total** — `transaction.Total -= couponDiscountAmount` (`transaction_usecase.go:90`). A checkout of three rental tickets gets one transaction-wide discount. "40% off **his** ticket only" cannot be modeled when only some of the tickets qualify.

3. **No "free duration" discount type.** The only types are `fixed` (subtract rupiah) and `percentage` (subtract a % of total) — see `apps/api/domain/coupon_entity.go:7-10`. "Bill one hour less" is neither: in a tiered pricing model the price of an hour is not a fixed number, so it must be expressed as *reduce the billable minutes, then re-price*.

4. **No eligibility rule.** Nothing stores or checks a minimum play time. "FREE 1 HOUR requires ≥ 2 hours" has nowhere to live.

This PRD extends the coupon model so coupons can be **scoped to a single rental ticket**, **conditioned on play time**, and can express **free duration**, and makes them selectable **at the rental checkout screen** where duration is finally known.

---

## Context: Existing System

- **Backend**: Go REST API, MySQL + GORM, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations/` via `golang-migrate` (next free number is **000012**).
- **Frontend**: Next.js web (`apps/web/`) + React Native mobile (`apps/mobile/`) sharing a Tamagui UI library (`libs/ui/`). React Query for server state, Zod + React Hook Form for forms.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`, codegen consumed by both frontends.

### Coupon domain today

- **Entity** (`apps/api/domain/coupon_entity.go`):
  ```go
  type CouponType string
  const ( Fixed CouponType = "fixed"; Percentage CouponType = "percentage" )
  type Coupon struct { Id; Code; Type; Amount int64; CreatedAt; DeletedAt }
  ```
- **Schema** (`apps/api/migrations/000001_initial_schema.up.sql:65-74`):
  ```
  coupons(id, code, type, amount, created_at, deleted_at)   UNIQUE(code)
  ```
- **Junction** (same file, `transaction_coupons`): snapshots `(transaction_id, coupon_id, type, amount)` — the coupon's type/amount at apply time, so later coupon edits don't rewrite history.
- **Application math** (`transaction_usecase.go:82-90`): `fixed` subtracts `amount`; `percentage` subtracts `RoundToNearest500(total * amount / 100)`.
- **Frontend**: `libs/ui/src/domain/entities/Coupon.ts` (`CouponType = 'fixed' | 'percentage'`), coupon picker `CouponList.tsx` (a bottom sheet) used inside the **transaction** create screen only.

### Rental domain today

- **One rental row = one person = one "ticket."** A group of three players is three rental rows (design rule from `trd-board-game-rental-pricing.md`).
- **Check-in** snapshots the variant's pricing tiers onto `rentals.pricing_tiers` (JSON). Billing reads only the snapshot.
- **Check-out** (`rental_usecase.go:83-155`): for each `rentalId`, compute `duration = now − checkin_at`, price via `CalculatePrice(snapshot, duration)` (`apps/api/domain/pricing_calculator.go`), and emit **one `TransactionItem`** per rental (`Amount=1`, `Price`, `Subtotal=Price`, `RentalId`, `Note="<duration>"`). The items become one `Transaction`. **No coupon is ever consulted.**
- **Checkout request** today carries only a list of rental IDs; the transaction is created server-side. The frontend usecase is `libs/ui/src/domain/usecases/rentalCheckout.ts`, screen rendered by `apps/web/src/pages/rentals/checkout.tsx`.
- **`TransactionItem.DiscountAmount`** already exists (`transaction_entity.go:14`, column `transaction_items.discount_amount`) and already flows into `Subtotal = Price − DiscountAmount` for manual transactions. **Per-ticket discounts have a home in the data model already** — they just aren't produced by the rental flow.

### The pricing calculator (the lever for "free duration")

```go
// pricing_calculator.go
func CalculatePrice(tiers []PricingTier, duration time.Duration) (PricingResult, *Error) {
    durationMinutes := ceil(duration.Minutes())
    for _, tier := range tiers { if tier.UpToMinutes >= durationMinutes { return tier.Price } }
    return tiers[last].Price // cap
}
```

"Bill one hour less" = call this with `duration − 60min`. That is the whole trick, and it reuses the audited calculator unchanged.

---

## Proposed Solution

Add three orthogonal capabilities to coupons, then surface coupon selection on the rental checkout screen.

### 1. Coupon **scope** — where the discount lands

A new `scope` field:

| Scope | Meaning | Applies to |
|---|---|---|
| `transaction` | Whole-bill discount (today's behavior). | Manual transaction create screen, unchanged. |
| `rental_item` | Discount one rental **ticket** (one `TransactionItem`). | Rental checkout screen. |

`scope` defaults to `transaction`, so every existing coupon keeps behaving exactly as it does now.

### 2. A new coupon **type** — `free_duration`

`type` extends from `{fixed, percentage}` to `{fixed, percentage, free_duration}`. For `free_duration`, `amount` is **minutes of free play** (FREE 1 HOUR = `60`, FREE 2 HOUR = `120`). It only makes sense with `scope = rental_item`.

### 3. Coupon **eligibility** — `min_play_minutes`

A new `min_play_minutes` integer (default `0`). A `rental_item` coupon may be applied to a ticket only if the ticket's **actual** played minutes ≥ `min_play_minutes`. FREE 1 HOUR sets `120`; FREE 2 HOUR and STUDENT DISCOUNT set `0`.

### 4. The three coupons, expressed in the model

| Coupon | `type` | `amount` | `scope` | `min_play_minutes` |
|---|---|---:|---|---:|
| FREE 1 HOUR | `free_duration` | 60 | `rental_item` | 120 |
| FREE 2 HOUR | `free_duration` | 120 | `rental_item` | 0 |
| STUDENT DISCOUNT | `percentage` | 40 | `rental_item` | 0 |

### 5. Apply coupons **at checkout**, per ticket

`POST /rentals/checkout` is extended so each rental in the request may carry an **optional `couponId`**. At checkout the server, per rental, computes duration, validates the coupon's scope + eligibility against the actual play time, computes the discount, writes it to that ticket's `TransactionItem.DiscountAmount`, and records a `transaction_coupons` row linked to that specific item.

### 6. Checkout screen gets a per-ticket coupon picker

The rental checkout screen lists each ticket with its duration and computed subtotal. Each ticket gets an "Apply coupon" affordance offering only `rental_item` coupons; ineligible coupons (e.g. FREE 1 HOUR on a 40-minute ticket) are disabled with the reason shown. Selecting one updates that ticket's subtotal and the grand total live.

The existing **transaction** create screen and its whole-bill coupon picker are **untouched**.

---

## Confirmed Product Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | "Free X hours" semantics | **Reduce billable minutes by `amount`, then re-price through `CalculatePrice`.** Not "subtract the rupiah value of X hours." | In a tiered model the marginal hour has no single price. Reducing duration and re-pricing is the faithful, unambiguous meaning and reuses the audited calculator. Worked examples in FR-3. |
| D2 | Free duration ≥ actual play time | **Ticket is fully free (subtotal = 0).** Billable minutes clamp at 0. | FREE 2 HOUR on a 1-hour rental = nothing to pay. Note: `CalculatePrice(…, 0)` would otherwise return the smallest tier, so the usecase must short-circuit `billable ≤ 0 → price 0`. |
| D3 | Discount representation | Store the **rupiah discount** on `TransactionItem.DiscountAmount`; `Subtotal = base price − discount`. Record the coupon link + snapshot in `transaction_coupons` (now with a nullable `transaction_item_id`). | Keeps `transaction.Total` = Σ subtotals, so the existing income/budget math in `PayTransaction` flows unchanged. The free-duration discount is materialized as money at checkout time, when duration is known. |
| D4 | Coupons per ticket | **At most one coupon per rental ticket** in v1 (no stacking). | Keeps math and UI simple; covers all three target coupons. Stacking is a future PRD. |
| D5 | Scope enforcement | A `rental_item` coupon **cannot** be selected on the manual transaction screen; a `transaction` coupon cannot be selected per-ticket at checkout. | Each scope is offered only where it makes sense; the server validates scope on both paths. |
| D6 | Eligibility failure | Server **rejects checkout with 400** if a chosen coupon fails its `min_play_minutes` check; the UI **disables** the coupon up front so this is unreachable through normal use. | Defense in depth — the UI prevents it, the server guarantees it. |
| D7 | Same coupon on multiple tickets | **Allowed.** Two students in one checkout each apply STUDENT DISCOUNT to their own ticket. | Coupons are reusable rules, not single-use codes, in the current system. No usage-limit concept is introduced here. |
| D8 | Percentage rounding for tickets | Reuse `RoundToNearest500` for `rental_item` percentage discounts, same as transaction-scope today. | Consistency with existing IDR rounding behavior. |
| D9 | Backward compatibility | New columns are additive with defaults (`scope='transaction'`, `min_play_minutes=0`); `transaction_coupons.transaction_item_id` is nullable (null = whole-transaction). The OpenAPI changes are additive; the checkout request's `couponId` is optional. | No existing coupon, transaction, or consumer needs changing. |

---

## Feature Requirements

### FR-1: Extended Coupon Model

`coupons` gains:
- `scope VARCHAR(50) NOT NULL DEFAULT 'transaction'` — `transaction` | `rental_item`.
- `min_play_minutes INT NOT NULL DEFAULT 0`.
- `type` value set extends to include `free_duration` (no DDL change — already `VARCHAR(50)`).

Validation in the coupon create/update usecase:
- `type = free_duration` ⇒ `scope` must be `rental_item` and `amount > 0` (minutes).
- `type = percentage` ⇒ `0 < amount ≤ 100`.
- `type = fixed` ⇒ `amount > 0`.
- `min_play_minutes ≥ 0`; only meaningful for `rental_item` scope (ignored for `transaction`).

### FR-2: Seed the Three Coupons

A migration seeds exactly these rows (idempotent on `code`):

| code | type | amount | scope | min_play_minutes |
|---|---|---:|---|---:|
| `FREE 1 HOUR` | `free_duration` | 60 | `rental_item` | 120 |
| `FREE 2 HOUR` | `free_duration` | 120 | `rental_item` | 0 |
| `STUDENT DISCOUNT` | `percentage` | 40 | `rental_item` | 0 |

(The owner can later also create/edit these via the admin UI — FR-6.)

### FR-3: Per-Ticket Discount Calculator (Acceptance Tests)

A pure function computes a ticket's discount from `(snapshotTiers, actualDuration, coupon)`:

```
base       = CalculatePrice(tiers, actualDuration).Price
actualMin  = ceil(actualDuration.minutes)

if coupon == nil:                      discount = 0
elif coupon.scope != rental_item:      ERROR (wrong scope)
elif actualMin < coupon.minPlayMinutes: ERROR (not eligible)
else switch coupon.type:
  free_duration:
      billableMin = max(0, actualMin - coupon.amount)
      discounted  = billableMin <= 0 ? 0 : CalculatePrice(tiers, billableMin*time.Minute).Price
      discount    = base - discounted
  percentage:
      discount    = RoundToNearest500(base * coupon.amount / 100)
  fixed:
      discount    = min(coupon.amount, base)     // never negative subtotal

subtotal = base - discount
```

Worked examples against the seeded Hourly tier set (60→15K, 90→20K, 120→30K, 150→35K, 180→45K, …):

| # | Coupon | Played | Base | Billed minutes | Subtotal | Discount |
|---|---|---|---:|---|---:|---:|
| 1 | FREE 1 HOUR | 2h 0m (120m) | 30,000 | 60m → 15K | 15,000 | 15,000 |
| 2 | FREE 1 HOUR | 3h 0m (180m) | 45,000 | 120m → 30K | 30,000 | 15,000 |
| 3 | FREE 1 HOUR | 1h 30m (90m) | 20,000 | — | — | **rejected** (90 < 120) |
| 4 | FREE 2 HOUR | 3h 0m (180m) | 45,000 | 60m → 15K | 15,000 | 30,000 |
| 5 | FREE 2 HOUR | 1h 0m (60m) | 15,000 | 0m → free (D2) | 0 | 15,000 |
| 6 | STUDENT DISCOUNT | 2h 0m (120m) | 30,000 | n/a | 17,500 | 12,500 (`round500(30000×40/100)`) |
| 7 | (none) | 2h 0m | 30,000 | n/a | 30,000 | 0 |

### FR-4: Checkout Applies Per-Ticket Coupons

`POST /rentals/checkout` request shape extends from a list of IDs to a list of `{ rentalId, couponId? }`. Per rental the server:
1. Loads the rental, guards against double-checkout (unchanged).
2. Computes `duration` and `base` (unchanged).
3. If `couponId` present: loads the coupon, runs the FR-3 calculator. On scope/eligibility error → **400**, whole checkout rolls back (it already runs in one DB transaction).
4. Emits the `TransactionItem` with `DiscountAmount = discount`, `Subtotal = base − discount`.
5. Records a `transaction_coupons` row `{ transaction_id, coupon_id, transaction_item_id, type, amount }` (snapshotting type+amount) for each applied coupon.

`transaction.Total` remains Σ of item subtotals, so `PayTransaction` income/budget math is untouched.

### FR-5: Multi-Ticket Checkout Behavior

A checkout of 3 tickets where ticket B has STUDENT DISCOUNT and tickets A, C have none:
- A and C: full price.
- B: 40% off B's subtotal only.
- Grand total = A + (0.6×B rounded) + C.

This is the requirement's "not all tickets can use STUDENT DISCOUNT" case, working by construction because the discount is per-`TransactionItem`.

### FR-6: Coupon Admin UI

The coupon create/edit form (`libs/ui/src/presentation/...` coupon form + `apps/web/src/pages/coupons/...`) gains:
- A **scope** selector (`transaction` / `rental_item`).
- The **type** selector gains `free_duration` (shown/relevant only when scope is `rental_item`).
- A **min play minutes** numeric input (shown only for `rental_item`).
- Amount field label adapts: "Amount (Rp)" for fixed, "Percent (%)" for percentage, "Free minutes" for free_duration.
- Zod mirrors the FR-1 validation.

### FR-7: Checkout Screen UI

The rental checkout screen (`apps/web/src/pages/rentals/checkout.tsx` → its `libs/ui` screen) renders, per ticket:
- Player name • variant • duration • **base price**.
- An "Apply coupon" control listing only `rental_item` coupons. Coupons failing the ticket's eligibility (actual minutes < `min_play_minutes`) are **disabled** with a hint ("needs ≥ 2h play").
- On selection: show the discount and the new subtotal for that ticket; update the **grand total** live.
- Allow clearing the coupon. At most one coupon per ticket (D4).

The submitted checkout payload carries each ticket's optional `couponId`.

### FR-8: Mobile Parity

React Native checkout screen (`apps/mobile/`) offers the same per-ticket coupon picker. Coupon **admin** editing may remain web-only for v1 (consistent with how rental pricing tier editing was scoped). Most primitives are shared through `libs/ui`.

---

## Data Model Changes

### Altered: `coupons`
```sql
ALTER TABLE coupons
  ADD COLUMN scope            VARCHAR(50) NOT NULL DEFAULT 'transaction',
  ADD COLUMN min_play_minutes INT         NOT NULL DEFAULT 0;
```
`type` stays `VARCHAR(50)` — `free_duration` needs no DDL.

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
`transaction_items.discount_amount` already exists and is the storage for per-ticket discounts. No change to `transactions`, `rentals`, `pricing_tiers`, or `variants`.

### Seed
The three coupons of FR-2, inserted idempotently keyed on `code`.

---

## API Changes

| Method | Path | Change |
|---|---|---|
| `POST /coupons`, `PUT /coupons/{id}` | Request/response gain `scope` and `min_play_minutes`; `type` enum gains `free_duration`. Additive. |
| `GET /coupons`, `GET /coupons/{id}` | Response gains `scope`, `min_play_minutes`. Additive. |
| `POST /rentals/checkout` | Request changes from `{ rentalIds: number[] }` to `{ rentals: [{ rentalId: number, couponId?: number }] }`. The transaction response gains per-item `discountAmount` (already present in the transaction schema). |
| `GET /transactions/{id}` | `transaction_coupons` entries gain optional `transactionItemId`. Additive. |

OpenAPI edits live in `libs/api-contract/src/api.yaml`; codegen regenerates the TS clients. The only **non-additive** change is the checkout request body — coordinated in one phase across backend + contract + both frontends.

---

## Out of Scope

- **Coupon stacking** (more than one coupon per ticket, or per-ticket + whole-bill together). D4.
- **Usage limits / single-use codes / expiry dates.** Coupons remain reusable rules.
- **Auto-applying** coupons (e.g. auto-grant FREE 1 HOUR when ≥ 2h). Staff selects manually.
- **Per-ticket coupons on the manual transaction screen** (non-rental product items). The `rental_item` scope is built generically but only surfaced at rental checkout in v1.
- **Discounts on purchase (non-rental) items.** Unchanged.
- **Time-of-day / weekday-weekend coupon conditions.** Only `min_play_minutes` is introduced.

---

## Open Questions

1. **FREE 2 HOUR on a sub-2-hour rental → fully free (D2).** Confirm the cafe wants "2 free hours" to be able to zero out a short rental, rather than capping the free benefit at the played time only (which would also yield 0 here, but differs for "free duration as rupiah-credit" interpretations — already excluded by D1).
2. **Does STUDENT DISCOUNT apply to the food/drink items in the same checkout, or rentals only?** This PRD scopes it to rental tickets (the requirement says "ticket"). If students should also get % off snacks, that needs the `rental_item` scope generalized to all transaction items — a follow-up.
3. **Should the seeded coupon codes be exactly `FREE 1 HOUR` / `FREE 2 HOUR` / `STUDENT DISCOUNT`** (with spaces), or slugs (`FREE_1_HOUR`)? Codes are unique and user-facing; confirm the preferred display form.
