# PRD: Product & Variant Stock Availability

## Problem Statement

Nothing in the system knows whether a sellable item is actually available right now.

`GET /public/products` and `GET /public/variants` return every published, purchasable product
and every one of its variants (`apps/api/domain/product_usecase.go`,
`apps/api/domain/variant_usecase.go`). The order app renders all of them
(`libs/ui/src/domain/usecases/menuList.ts` → `MenuProductCard`), and the POS grid does the same
(`libs/ui/src/presentation/views/components/transactions/TransactionItemSelect.tsx`). The only
gate that exists is `CartUsecase.validatePurchasableVariant`
(`apps/api/domain/cart_usecase.go:237`), and it checks three things — not deleted, `status =
published`, `sale_type = purchase` — none of which says anything about whether the kitchen can
still make the item.

The consequences are concrete:

1. **A customer orders something that does not exist.** The vanilla syrup ran out at 14:00; the
   order app still sells Es Kopi Susu Vanilla at 19:00, the QRIS is paid, and the barista has to
   go to the table and negotiate a refund or a substitution.
2. **The crew's only workaround is destructive.** Today the only way to take an item off the menu
   is to flip the product to `draft` (`docs/prd-product-draft-status.md`) or soft-delete it.
   `draft` hides the product from checkout *entirely*, so taking Vanilla off the menu takes
   Banana and Hazelnut with it, and the product also disappears from the order app's menu instead
   of showing as sold out.
3. **Nobody can see what is left.** Soft Cookies are baked in the morning in a known quantity.
   That number lives in someone's head, and when that person goes home it is gone.

### Root cause

The catalog models what an item **is** (`Product`, `Variant`, `Option`, `OptionValue`) and what it
**costs** (`Variant.Price`, `VariantMaterial`), but never what is **left of it**. The word "stock"
already exists in this codebase and refers to something else entirely: `StockCheck` /
`StockCheckItem` (`apps/api/domain/stock_check_entity.go`) count **raw materials in purchase
units** for a weekly shopping list (`docs/prd-inventory-management.md`). That is a procurement
tool measured in sacks of flour, snapshotted once a day at closing. It cannot answer "can I sell
one more Pancong right now", and it must not be overloaded to try.

This PRD adds the missing concept — **sellable availability** — and keeps it strictly separate
from material inventory.

---

## How the Industry Handles This

Restaurant and retail POS vendors converge on the same three primitives, which is a useful
sanity check on the design below:

- **A manual "sold out" flag that is independent of any count.** Square lets a seller mark an
  item variation sold out "even if its inventory count isn't zero", and this flag lives at the
  *variation* level, not the item level. Toast calls the same thing *86-ing* an item.
- **Optional per-variation counting, off by default.** Square requires explicitly toggling
  "Advanced Stock Tracking" per variation before counts exist at all; untracked items simply
  never run out. Toast shows the remaining count on the item button and blocks selection at 0.
- **No automatic overnight reset.** In Toast, "the menu item's status remains as Out of Stock
  until you manually change the status." Restoring availability is a deliberate human act.

The one thing vendors do that this PRD deliberately does **not** copy is deriving availability
from ingredient depletion (Toast's menu-item inventory, Square's item components). That requires
recipe accuracy the cafe does not have yet — see **Deferred**.

---

## Alternatives Considered

The hard part is not "where do we put a number". It is that the three real menu items in the
request behave in three different ways, and a fourth way shows up as soon as you look closely:

| Item | Behaviour |
| --- | --- |
| **Es Kopi Susu** (Vanilla / Banana / Hazelnut) | Coffee never runs out. The *syrup* does. Needs a per-variant on/off switch and **no number at all**. |
| **Soft Cookies** (Choco / Red Velvet) | Baked per variant in known quantities — 6 and 3. Needs a **per-variant count**. |
| **Pancong** (Choco / Matcha / Vanilla) | One batch of dough serves 5, shared by all three variants. Needs a **product-level count**. |
| **Pancong, matcha powder finished** | Dough left, but one topping is gone. Needs a **per-variant switch on top of a product-level count**. |

### Option A — Separate "tracking level" per product, plus always-on availability switches ✅ Recommended

Two orthogonal primitives:

- **An availability switch on `Product` and on `Variant`**, always present, manually operated,
  independent of any counting. This alone solves Es Kopi Susu.
- **One optional counter**, at a level the product declares: `none`, `product`, or `variant`.
  This solves Soft Cookies (`variant`) and Pancong (`product`).

Because the switches exist at both levels regardless of the counting level, the fourth case
composes for free: Pancong counts dough at the product level *and* switches Matcha off at the
variant level.

- ✅ All four cases, with five columns and zero new tables.
- ✅ Existing rows default to `tracking = none`, both switches on — identical behaviour to today.
- ✅ Matches how Square and Toast expose it to staff (a sold-out flag and an optional count).
- ✅ Availability resolves from data already loaded: the order menu fetch already pulls every
  product *and* every variant in one pass (`libs/ui/src/data/api/menu.ts`), so no new read
  endpoint is needed for the customer app.
- ❌ A product cannot mix counted and uncounted variants — the counting level is declared once per
  product. Not needed by any case above.
- ❌ Two nullable `stock_quantity` columns on two tables, and an audit ledger that has to point at
  either a product or a variant.

### Option B — A `stocks` pool table with `variants.stock_id`

One `stocks` row per tracked pool (quantity, availability flag); each variant points at a pool or
at nothing. Pancong = three variants sharing one pool; Soft Cookies = two variants, two pools; Es
Kopi Susu = pools in "no count" mode.

- ✅ The most general model: arbitrary sharing, including *across* products (one "vanilla syrup"
  pool shared by Es Kopi Susu and Es Teh Vanilla).
- ✅ A single FK target for the audit ledger.
- ❌ The operator never sees pools — the POS UI would have to present "none / shared / per
  variant" anyway and **materialize** pools behind it, so the schema's flexibility buys nothing a
  user can reach while adding a whole lifecycle to get wrong: what happens to a pool when a
  variant is added, deleted, or moved between products; what quantity survives when the operator
  switches a product from per-variant to shared.
- ❌ Phase 1 stops being a no-behaviour-change migration.

Rejected for now. If cross-product sharing is ever actually requested, Option A migrates into it
cleanly — see **Deferred**.

### Option C — Derive availability from material stock

The recipe link already exists (`VariantMaterial`: variant → material → amount), and materials
already carry a stock number via `StockCheck`. In principle "vanilla syrup = 0" could switch
Vanilla off automatically.

- ✅ Zero daily data entry — the number the crew already records drives the menu.
- ❌ The material number is **not live**. A `StockCheck` is a snapshot created at closing
  (`docs/prd-inventory-management.md`), in **purchase units** (bottles, sacks), and is not
  decremented by sales. Menu availability driven by yesterday's bottle count would be wrong
  within an hour of opening.
- ❌ It needs recipe accuracy the cafe does not have: every variant would need a correct
  per-serving material amount, or the derivation silently lies.
- ❌ It cannot express "we only made 5 Pancong today" — that is a production decision, not an
  ingredient one.

Rejected as the mechanism. Retained as a future *advisory* input — see **Deferred**.

**Recommended: Option A.**

---

## Proposed Solution

### The model

Five new fields, no new tables (the audit ledger in FR-8 is the one exception and lands last):

| Field | Table | Type | Default | Meaning |
| --- | --- | --- | --- | --- |
| `is_available` | `products` | `BOOLEAN NOT NULL` | `TRUE` | Manual kill switch for the whole product. |
| `stock_tracking` | `products` | `ENUM('none','product','variant') NOT NULL` | `'none'` | Where the counter lives, if anywhere. |
| `stock_quantity` | `products` | `INT NULL` | `NULL` | The counter. Meaningful only when `stock_tracking = 'product'`. |
| `is_available` | `variants` | `BOOLEAN NOT NULL` | `TRUE` | Manual kill switch for one variant. |
| `stock_quantity` | `variants` | `INT NULL` | `NULL` | The counter. Meaningful only when `stock_tracking = 'variant'`. |

**Remaining quantity of a variant** (`null` means "not counted", which is never a blocker):

```
remaining(variant) =
  product.stock_tracking = 'none'     → null
  product.stock_tracking = 'product'  → product.stock_quantity
  product.stock_tracking = 'variant'  → variant.stock_quantity
```

**A variant is available when all of these hold:**

```
product.deleted_at IS NULL AND variant.deleted_at IS NULL
AND product.status    = 'published'      (existing rule)
AND product.sale_type = 'purchase'       (existing rule)
AND product.is_available
AND variant.is_available
AND (remaining(variant) IS NULL OR remaining(variant) > 0)
```

**A product is available** when at least one of its variants is.

### The four cases, expressed

| Item | `products` | `variants` |
| --- | --- | --- |
| **Es Kopi Susu** | `tracking = none`, `is_available = true` | Vanilla `is_available = false`; Banana, Hazelnut `true` |
| **Soft Cookies** | `tracking = variant`, `is_available = true` | Choco `stock_quantity = 6`, Red Velvet `= 3` |
| **Pancong** | `tracking = product`, `stock_quantity = 5` | all three `is_available = true` |
| **Pancong, matcha out** | `tracking = product`, `stock_quantity = 5` | Matcha `is_available = false`, others `true` |

Note what case 1 means in practice: **Es Kopi Susu needs no number and no daily data entry at
all.** The crew flips one switch when the syrup runs out and flips it back when the new bottle
arrives — exactly how they think about it today.

### When stock is decremented

**At transaction creation, in both apps.** (D3)

The order app already creates the `Transaction` row at checkout, *before* the QRIS is paid, and
soft-deletes it when the payment expires (`PaymentUsecase.Checkout` and
`applyQrisStatus` in `apps/api/domain/payment_usecase.go`). POS creates the transaction when the
barista submits the form. So transaction creation is the one moment both apps share, and the
release hook the order app needs already exists.

```
POS      item grid → [transaction created] → paid later at the counter
                            ↓ decrement
order    cart → checkout → [transaction created + QRIS pending] → paid | expired
                            ↓ decrement                                  ↓ release
```

The cart is deliberately **not** a reservation (D4): an order-app cart is an anonymous,
session-scoped row that is abandoned all the time, and holding stock against abandoned carts
would strangle the menu with no human anywhere in the loop to notice. The cart performs a
**soft check** only (FR-7); checkout performs the authoritative one.

### What the customer sees

Availability, never a raw count — with one exception: **when the remaining quantity is known, the
amount stepper cannot exceed it** (D9). A customer picking Soft Cookies Choco with 3 left can
step up to 3 and no further, with a hint at the cap. This is the least-leaky way to enforce the
limit at selection time, which is what the acceptance criteria ask for.

Out-of-stock items stay on the menu, dimmed and badged (**"Habis"** in the order app, **"Out of
stock"** in POS) — never hidden. That is the difference between this feature and the existing
`draft` status, and it is an explicit acceptance criterion.

---

## Feature Requirements

### FR-1 — Availability fields on Product and Variant

The five fields above, end to end: migration, `apps/api/domain/product_entity.go` and
`variant_entity.go`, the MySQL entities and transformers, the OpenAPI schemas, and the seeder.
Existing rows keep today's behaviour via the column defaults.

`stock_tracking` is set on the **product form**; quantities and switches are set on the **Stock
screen** (FR-4). Changing `stock_tracking` clears the counters on both levels and leaves the
switches alone (D2) — a number entered against the old level is meaningless against the new one,
and silently reinterpreting it is worse than asking for it again.

### FR-2 — Availability is resolved server-side and exposed on every read

`ResolveVariantAvailability(product, variant)` and `ResolveProductAvailability(product, variants)`
live in `apps/api/domain` as pure functions with their own table-driven test. Every read that a
sales surface uses carries the result:

| Schema | New fields |
| --- | --- |
| `Variant` | `isAvailable: bool` (manual switch), `isSellable: bool` (resolved), `remainingStock: int \| null` |
| `Product` | `isAvailable: bool` (manual switch), `stockTracking`, `isSellable: bool` (resolved — any variant sellable), `remainingStock: int \| null` |

Both the authenticated (`/products`, `/variants`) and public (`/public/products`,
`/public/variants`) responses carry them, so neither app has to re-derive the rule (D5). The
clients still need `remainingStock` to cap the stepper, and `isAvailable` separately from
`isSellable` so the POS Stock screen can show *why* something is off.

No filtering is added — out-of-stock items must keep appearing in both apps.

### FR-3 — Stock is reserved at transaction creation and released on reversal

Every write point, all of them already inside a `BeginTransaction` block:

| # | Site | Effect |
| --- | --- | --- |
| 1 | `TransactionUsecase.CreateTransaction` | Validate, then decrement per item. |
| 2 | `PaymentUsecase.Checkout` | Same, for the order-app transaction it creates. |
| 3 | `TransactionUsecase.UpdateTransactionById` | Apply the **delta** between the old and new item sets (POS may only edit unpaid transactions — the existing `paidAt` guard). |
| 4 | `TransactionUsecase.DeleteTransactionById` | Release everything the transaction holds. |
| 5 | `applyQrisStatus`, expired/failed branch | Already calls `DeleteTransactionById` → releases via 4. |
| 6 | `applyQrisStatus`, paid-late branch | `UndeleteTransactionById` → **re-decrement, allowed to go negative** (D7). |
| 7 | Stock screen save (FR-4) | Set or adjust, by a human. |

Rules:

- Amounts are summed **per counting unit** before validation: two lines of Pancong Choco and one
  of Pancong Matcha need 3 off the shared product counter; the same variant appearing on two
  lines with different notes is one variant total.
- Untracked items (`remaining = null`) are validated for the switches only and never decremented.
- Rejection returns `domain.BadRequest` naming the item: `"Soft Cookies Choco is out of stock"`
  / `"only 2 Pancong left"`. The `Error` schema carries `code` + `message` only, so clients
  **refetch and re-derive** which rows are unavailable rather than parsing the message (D8).
- Release is guarded by the `deleted_at NULL → NOT NULL` transition inside the same DB
  transaction, so a double delete cannot double-release.
- Rental items (`sale_type = 'rental'`) are untouched — see **Out of Scope**.

Concurrency: the counter row is read `SELECT ... FOR UPDATE` inside the enclosing transaction, so
two customers racing for the last cookie serialize and the loser gets the rejection above (D6).

### FR-4 — POS Stock screen

A single screen at `/stock`, reachable from the **Inventory** group in the sidebar
(`libs/ui/src/presentation/views/components/base/Sidebar/Sidebar.state.tsx`) — this is the
acceptance criterion about not opening products one by one.

It lists **every published, purchasable product**, grouped by category, with a search box and a
"Sold out only" filter. Each row shows:

- the product switch, and the product counter when `stock_tracking = 'product'`;
- one sub-row per variant with its switch, and its counter when `stock_tracking = 'variant'`;
- a resolved `Out of stock` badge wherever FR-2 says the item is not sellable.

Counters are edited with a stepper plus a direct numeric input (typing `5` at opening is one
gesture, `+1` after a miscount is another). **Save sends only the rows that changed** (D10), so
two crew members editing different items at the same time do not clobber each other.

The screen is modelled on `StockCheckCreateScreen`, which already does "list everything, capture a
number per row, save in one request" — but it is a **different screen for a different thing**, and
must not be conflated with material stock checks.

Nothing resets overnight (D11). Leftover cookies are still leftover cookies in the morning; the
crew types today's Pancong count at opening.

### FR-5 — POS blocks the sale, and offers the fix

`TransactionItemSelect` dims out-of-stock products, badges them `Out of stock`, disables the
option-value radio for a sold-out variant, shows `n left` on counted items, and caps the amount
stepper at the remaining quantity. Submitting anyway (a stale grid, or a race) surfaces the
server's message as an error toast with a **"Update stock"** action that routes to `/stock` with
the offending product pre-searched.

Blocked, not overridable (D12): the POS count is the number the customer app is trusting. A
barista who genuinely has one more cookie fixes the number — two taps — and the order app becomes
correct at the same moment.

### FR-6 — Order app shows out of stock, and caps the picker

- `MenuProductCard`: when no variant is sellable — dimmed, a `Habis` badge, press disabled.
- `MenuItemDetailScreen` / `OptionValueChipGroup`: an option value is disabled when **no sellable
  variant matches the current partial selection plus that value** — so Vanilla greys out while
  Banana and Hazelnut stay live. Disabled chips keep their label and gain a `Habis` marker; they
  are never removed, so the customer can see the item exists.
- `AmountStepper` gains a `max` prop; the sheet passes `remainingStock` and shows `Sisa n` once
  the customer reaches the cap.
- The sheet's add-to-cart button is disabled with `Stok habis` when the resolved variant is not
  sellable.

All of this resolves client-side from data the menu fetch already returns
(`libs/ui/src/data/api/menu.ts` pulls products, categories and **all variants** in one
`Promise.all`), so there is no extra round trip.

### FR-7 — Cart soft-check, checkout hard-check

`CartUsecase.validatePurchasableVariant` (`apps/api/domain/cart_usecase.go:237`) gains the
availability rule, and `AddCartItem` / `UpdateCartItem` additionally reject a requested amount
that exceeds what is left **counting what the same cart already holds** for that counting unit.
Nothing is reserved.

Because time passes between adding and paying, `CartScreen` re-derives availability on every load
and flags affected lines (`Habis` / `Sisa n`) with the checkout button disabled until the customer
removes or reduces them. A checkout rejected by FR-3 refetches the cart and lands in that same
state — one code path, not two.

### FR-8 — Stock movement ledger (audit)

`stock_movements`: `product_id` / `variant_id` (exactly one set), `delta`, `resulting_quantity`,
`reason` (`sale`, `sale_reversal`, `manual_set`, `manual_adjust`), `transaction_id`, `note`,
`created_at`. Written in the same DB transaction as every counter change, for counted items only.

It is **audit-only** (D13) — the counter stays the source of truth, so no read path pays for an
aggregation. It answers the question the crew will ask on day two: "it said 5 this morning, where
did they go?" Surfaced as a history sheet from each Stock screen row.

### FR-9 — Product form declares the tracking level

A `Stock tracking` selector (`None` / `Shared across variants` / `Per variant`) on
`ProductCreateScreen` and `ProductUpdateScreen`, with helper text naming a real example for each.
Quantities are **not** editable here — a link points to the Stock screen. Switching the value
warns that existing counts will be cleared (FR-1).

---

## Design decisions

- **D1 — Availability switches live on both `Product` and `Variant`, always, independent of
  counting.** They are what makes Es Kopi Susu work with no numbers, and what lets a per-variant
  problem coexist with a product-level count (Pancong matcha). *Alternative rejected:* a single
  `mode` enum per product (`toggle | counted`) — it cannot express a switch and a count at once,
  which is the fourth case.
- **D2 — Changing `stock_tracking` clears both counters.** A `5` entered as "5 servings of dough"
  means nothing as "5 of each variant". *Alternative rejected:* copying the product count down to
  each variant — it silently multiplies stock by the variant count.
- **D3 — Decrement at transaction creation.** The only moment both apps share, and the order app's
  release hook already exists. *Alternatives rejected:* at payment (POS routinely runs unpaid open
  bills, so every drink in progress would be invisible and the last cookie sells three times); at
  fulfilment (later still, widest oversell window).
- **D4 — The cart does not reserve.** Anonymous session carts are abandoned constantly and no
  human is watching to release them; a TTL-based reservation is a second expiry system to build
  and operate. The cart soft-checks (FR-7), checkout decides.
- **D5 — Availability is resolved server-side and shipped as a boolean.** One rule, one test, both
  apps and any future client agree. *Alternative rejected:* re-deriving it in `libs/ui` — the POS
  and order import graphs are deliberately separate (`docs/trd-ui-presentation-split-by-app.md`),
  so the rule would exist twice and drift.
- **D6 — `SELECT ... FOR UPDATE` on the counter row.** Correctness under two simultaneous
  checkouts, using the transaction boundary that already wraps every write point. *Alternative
  rejected:* optimistic `UPDATE ... WHERE stock_quantity >= n` with a rowcount check — fewer locks,
  but it cannot report *which* item of a multi-item order failed without a second query.
- **D7 — A late QRIS payment always wins, even into negative stock.** `applyQrisStatus` can mark
  an expired payment paid; the money has been captured by the gateway. Rejecting it there would
  leave a paid customer with no order. Negative counts are legal, and the Stock screen badges them
  in red so the crew notices.
- **D8 — Rejections are a code plus a human message; clients refetch to find the culprit.** The
  shared `Error` schema is `{code, message}` (`api.yaml`), and widening it for one feature would
  touch every endpoint. The refetch is the same code path the cart already needs (FR-7).
- **D9 — Customers see availability, plus a capped stepper.** No count on the card, no scarcity
  theatre, no leaking production volume — but the picker cannot ask for more than exists, and the
  `Sisa n` hint appears only at the cap, where it is an explanation rather than a sales tactic.
- **D10 — The Stock screen saves only changed rows.** Two crew members at opening are normal; a
  whole-screen PUT would make the second save undo the first.
- **D11 — No overnight reset.** Carry-over is the physically correct default: leftover cookies are
  real. An auto-reset to a daily target invents stock that may not exist, and an auto-reset to zero
  turns one forgotten morning into a fully sold-out menu. Matches Toast, where an 86'd item stays
  86'd until a human says otherwise. *Revisit if* the crew reports the morning entry as a burden —
  a per-item "daily target" with a one-tap **Restore all to target** action is the additive next
  step, and needs no schema change beyond one column.
- **D12 — POS blocks rather than warns.** The POS count is what the customer app trusts; an
  override makes the order app quietly wrong. The cost is bounded by the one-tap route to `/stock`
  from the error toast.
- **D13 — The ledger is audit-only; the counter is the source of truth.** The menu read path is the
  hottest in the system and must not aggregate movements. *Alternative rejected:* event-sourced
  stock (quantity = opening + Σ movements) — correct by construction, but every menu load pays for
  it and every phase gets bigger.
- **D14 — Sellable stock is a separate concept from `StockCheck`.** Different unit (servings vs
  purchase units), different cadence (live vs daily snapshot), different consumer (the menu vs the
  shopping list). Sharing a table or a screen between them would make both worse.

---

## Phased plan

Each phase is one PR, leaves `main` green and the product shippable on its own, and names its own
acceptance check.

| # | Phase | Layer | Depends on |
| --- | --- | --- | --- |
| 1 | Availability + stock columns | API | — |
| 2 | Availability resolution and exposure on reads | API | 1 |
| 3 | Stock read + bulk update endpoints | API | 2 |
| 4 | Reserve on POS transaction create; release on delete | API | 2 |
| 5 | Reserve on order checkout; release on QRIS expiry and re-apply on paid-late | API | 4 |
| 6 | Delta on transaction update | API | 4 |
| 7 | Cart soft-check | API | 2 |
| 8 | Frontend slice: entities, repository, use cases | libs/ui | 3 |
| 9 | POS Stock screen + sidebar entry | POS | 8 |
| 10 | Product form declares tracking level | POS | 1 |
| 11 | POS item grid shows and enforces availability | POS | 8 |
| 12 | Order app menu: badges and disabled chips | order | 2 |
| 13 | Order app: capped stepper, cart and checkout errors | order | 7, 12 |
| 14 | Stock movement ledger + history sheet | API, POS | 4, 5, 6, 9 |
| 15 | Docs site page + e2e coverage | docs, e2e | 11, 13 |

Phases 4–7 are independent of each other once 2 lands. The POS track (9–11) and the order track
(12–13) are independent of each other. Nothing customer-visible changes until phase 12, and
nothing is enforced until phase 4 — so 1–3 can land early and the crew can start entering real
numbers on the Stock screen before any blocking behaviour exists.

> Every phase that touches `libs/api-contract/src/api.yaml` regenerates both clients
> (`npx nx run api-contract:generate:go`, `npx nx run api-contract:generate:ts`) and may need the
> new symbol added to `libs/ui/src/__mocks__/api-contract.ts`, which Jest substitutes wholesale for
> the generated package.

---

### Phase 1 — Availability and stock columns (API)

Migration `000029_add_product_variant_stock` (next free number; `000028_add_transaction_completed_at`
is the latest) adding `is_available TINYINT(1) NOT NULL DEFAULT 1`, `stock_tracking
ENUM('none','product','variant') NOT NULL DEFAULT 'none'` and `stock_quantity INT NULL` to
`products`, and `is_available TINYINT(1) NOT NULL DEFAULT 1` + `stock_quantity INT NULL` to
`variants`, with a `down` that drops all five. `IsAvailable`, `StockTracking`, `StockQuantity` on
`apps/api/domain/product_entity.go` (with a `StockTracking` string-enum type beside `SaleType` and
`ProductStatus`) and `IsAvailable`, `StockQuantity` on `variant_entity.go`, carried through
`apps/api/data/mysql/{product,variant}_entity.go` and their transformers, the request/response
schemas in `api.yaml`, and the seeder. No behaviour change — nothing reads the columns yet.

**Acceptance:** `npx nx run api:test` green;
`MIGRATIONS_DIR=data/mysql/migrations make migrate-up && make migrate-down` clean both ways; an
existing product round-trips through `PUT /products/{id}` unchanged.

### Phase 2 — Availability resolution and exposure (API)

`ResolveVariantAvailability(product, variant) (isSellable bool, remaining *int)` and
`ResolveProductAvailability(product, variants)` in `apps/api/domain/stock_availability.go`, pure,
with `stock_availability_test.go` table-driving all four cases from the PRD plus the
deleted/draft/rental combinations. `isSellable` and `remainingStock` added to the `Product` and
`Variant` response schemas and populated in `apps/api/presentation/restapi/{product,variant}_transformer.go`
for both the authenticated and public endpoints. Product responses need their variants — the
transformer takes the variant list the handler already has, or fetches it where it does not.
No filtering, no writes.

**Acceptance:** `stock_availability_test.go` covers every row of the four-case table and both
`remaining = 0` and `remaining = null`; `GET /public/products` returns `isSellable: true` for
every existing product; `npx nx run api:test` green.

### Phase 3 — Stock read and bulk update endpoints (API)

`GET /stocks` → every published, purchasable product with its category, tracking level, switch,
counter and its variants' switches and counters, unpaginated (the catalog is small and the screen
needs all of it). `PUT /stocks` taking `{ products: [{ productId, isAvailable?, stockQuantity? }],
variants: [{ variantId, isAvailable?, stockQuantity? }] }` — **omitted fields are left alone**
(D10) — rejecting a `stockQuantity` for a level the product does not track, and rejecting a
negative value. `StockUsecase` + `StockRepository` in `apps/api/domain`, MySQL implementation,
mocks via `go generate ./...`, handler and routes under `CheckAuth`.

**Acceptance:** `stock_usecase_test.go` covers a partial update leaving untouched fields intact, a
quantity against `tracking = none` (rejected), and a negative quantity (rejected);
`stock_handler_test.go` covers both routes; `npx nx run api:test` green.

### Phase 4 — Reserve on transaction create, release on delete (API)

`ReserveStock(ctx, items)` and `ReleaseStock(ctx, items)` on a new `StockReservation` collaborator
of `TransactionUsecase`, summing amounts per counting unit, locking rows `FOR UPDATE`, and
returning `domain.BadRequest` with the item name on shortfall. Called from `CreateTransaction` and
`DeleteTransactionById` inside their existing `BeginTransaction` blocks. Untracked items are
validated for the switches only.

**Acceptance:** `transaction_usecase_test.go` covers a per-variant shortfall, a product-level
shortfall summed across two variants, the same variant on two lines, an untracked item (never
decremented), a switched-off variant, and delete-then-restore returning the counter to its
original value; `npx nx run api:test` green.

### Phase 5 — Reserve on order checkout, release on expiry, re-apply on paid-late (API)

`PaymentUsecase.Checkout` reserves after building its transaction items; the expired/failed branch
of `applyQrisStatus` releases through the `DeleteTransactionById` path from phase 4; the paid-late
branch re-reserves after `UndeleteTransactionById` **without a shortfall check**, allowing the
counter to go negative (D7).

**Acceptance:** `payment_usecase_test.go` covers checkout decrementing, expiry restoring, a
paid-late payment re-decrementing into negative stock and still succeeding, and a checkout
rejected when the cart's last item sold out in between; `npx nx run api:test` green.

### Phase 6 — Delta on transaction update (API)

`UpdateTransactionById` computes the per-counting-unit difference between the existing and
incoming item sets and reserves or releases the difference, behind the existing "cannot update
paid transaction" guard. Rental line items, which the method already carries over verbatim, are
excluded from the diff.

**Acceptance:** `transaction_usecase_test.go` covers increasing an amount (reserves the
difference), decreasing it (releases), removing a line, adding a line, swapping one variant for
another within a product-level counter (net zero), and a rejected increase leaving the counter
untouched; `npx nx run api:test` green.

### Phase 7 — Cart soft-check (API)

The availability rule added to `validatePurchasableVariant` (`cart_usecase.go:237`), and an amount
check in `AddCartItem` / `UpdateCartItem` that counts what the same cart already holds against the
same counting unit. Nothing is reserved.

**Acceptance:** `cart_usecase_test.go` covers adding a sold-out variant, adding 4 of a 3-count
variant, adding 2 + 2 of a 3-count variant across two calls, and two variants sharing a
product-level counter; `npx nx run api:test` green.

### Phase 8 — Frontend slice: entities, repository, use cases (libs/ui)

No UI. `isAvailable`, `isSellable`, `remainingStock`, `stockTracking` on
`libs/ui/src/domain/entities/{Product,Variant}.ts`; a `Stock` entity and `stockFormSchema`;
`StockRepository` with `fetchStockList` / `updateStocks`, implemented in `data/api/stock.ts` and
`data/mock/stock.ts`; `StockListUsecase` and `StockUpdateUsecase` in `domain/usecases/`, shaped as
`extends Usecase<State, Action, Params>` with a `getNextState` reducer and effects confined to
`onStateChange`, each with a `.test.ts` driving success via `UsecaseTester` + `flushPromises` and
the error branch via `MockStockRepository.setShouldFail(true)`. A shared
`resolveOptionValueAvailability(product, variants, selection)` helper in `libs/ui/src/utils/` for
phases 11 and 12. Barrel exports everywhere.

**Acceptance:** `npx nx run ui:test` green; the new use cases are reachable from
`@gatherloop-pos/ui/pos`; the option-value helper has its own test covering Es Kopi Susu with
Vanilla off.

### Phase 9 — POS Stock screen (POS)

`StockScreen` + `StockHandler` + `app/pos/Stock.tsx` + `apps/pos-web/src/pages/stock/index.tsx`,
and a `Stock` entry in the **Inventory** group of `Sidebar.state.tsx`. Grouped list, search,
"Sold out only" filter, per-row switch and stepper-plus-input, dirty-row tracking, one save.
`useForm` and the zod resolver live in the form component, not the handler (`docs/forms.md`).
Stories for loaded, empty, error, a negative count and a sold-out row.

**Acceptance:** a handler test with real use cases over `MockStockRepository` asserts that editing
two rows and saving sends exactly those two; Storybook renders all five states;
`npx nx run ui:test` green.

### Phase 10 — Product form declares the tracking level (POS)

The `Stock tracking` selector with its helper text on `ProductFormView`, threaded through
`ProductCreateScreen` / `ProductUpdateScreen` and the product form schema, with the
"existing counts will be cleared" confirmation on change.

**Acceptance:** `ProductFormView` stories cover all three values; the form test asserts the
confirmation fires only when the value actually changes; `npx nx run ui:test` green.

### Phase 11 — POS item grid shows and enforces availability (POS)

`TransactionItemSelect` dims and badges sold-out products, disables sold-out option values, shows
`n left`, caps the amount stepper at `remainingStock`, and renders the rejection toast with its
**Update stock** action routing to `/stock`. `TransactionItemSelect.test.tsx` extended.

**Acceptance:** the existing test file gains cases asserting a sold-out product's tile is present
but not selectable, a sold-out option radio is disabled while its siblings are not, and the
stepper stops at the remaining quantity; `npx nx run ui:test` green.

### Phase 12 — Order app menu: badges and disabled chips (order)

`MenuProductCard` gains a `Habis` badge, dimming and a disabled press when no variant is sellable;
`OptionValueChipGroup` gains per-value disabling driven by the phase-8 helper; the item sheet shows
`Stok habis` and disables add-to-cart for a sold-out resolved variant. Stories for each. Read-only —
no new requests, no new endpoints.

**Acceptance:** Storybook shows Es Kopi Susu with Vanilla greyed and Banana live, Soft Cookies with
one variant out, and a fully sold-out Pancong card; `npx nx run ui:test` green.

### Phase 13 — Order app: capped stepper, cart and checkout errors (order)

`max` on `AmountStepper` with the `Sisa n` hint at the cap, wired from `remainingStock` in the item
sheet, in `CartLineItem` and in `CartItemEditScreen`; `CartScreen` flags affected lines and
disables checkout; a rejected checkout refetches the cart and lands in that state.

**Acceptance:** `CartScreen` stories cover a line gone sold-out and a line over its remaining
count; a handler test asserts checkout stays disabled until the offending line is removed;
`npx nx run ui:test` green.

### Phase 14 — Stock movement ledger (API, POS)

Migration `000030_create_stock_movements`, writes from every counter change in phases 3–6, a
`GET /stocks/{level}/{id}/movements` endpoint, and a history sheet on each Stock screen row.

**Acceptance:** a sale followed by its reversal produces two movements summing to zero with
correct `resulting_quantity` values; the manual-set path records `manual_set`;
`npx nx run api:test` and `npx nx run ui:test` green.

### Phase 15 — Docs site and e2e (docs, e2e)

A `docs-site/inventory/stock-availability.md` feature page with its sidebar entry, covering the
three real menu items as worked examples and the morning routine. A `pos-web-e2e` spec for
set-stock → sell → sold-out, and an `order-web-e2e` spec for sold-out badge → capped stepper →
blocked checkout. Note that e2e runs post-merge only
(`.github/workflows/e2e-main.yml`), so both specs are run locally before the PR.

**Acceptance:** `npx nx run pos-web-e2e:e2e` and `npx nx run order-web-e2e:e2e` green locally;
the docs site builds.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| **The counts go stale and the crew stops trusting them.** The system's number is only as good as the morning entry. | The Stock screen is one tap from the sidebar and saves in one gesture; the ledger (phase 14) makes drift diagnosable instead of mysterious; blocking (D12) with a one-tap fix keeps corrections cheap and frequent. |
| **A blocked POS sale in front of a waiting customer.** | The error names the item and routes straight to `/stock`. Worth watching after rollout — if this fires often, D12 is the decision to revisit, not the model. |
| **Negative stock from paid-late QRIS (D7) confuses the crew.** | Negative counts are badged in red on the Stock screen, and the ledger shows the late payment that caused it. |
| **Someone conflates this with `StockCheck`.** Two features now say "stock". | Distinct routes (`/stock` vs `/stock-checks`), distinct sidebar labels, and D14 stated in the docs-site page. Worth a naming pass in review — "Availability" is the available alternative label if `/stock` proves confusing. |
| **The order app's menu snapshot goes stale between load and checkout.** | The menu already revalidates on every fetch (`menuList.ts` `revalidating` state); the cart re-derives on load; checkout is authoritative. A customer can still be told no at checkout — that is correct, and FR-7 makes it legible. |
| **Phase 2 changes every product and variant response shape.** | Both fields are additive and non-breaking; phase 1 lands the columns with behaviour-preserving defaults first, so a rollback of phase 2 alone is safe. |

---

## Out of Scope

- **Rental products** (`sale_type = 'rental'`). Board-game availability is already governed by the
  rental check-in/check-out flow (`docs/prd-rental-checkout-mobile.md`); adding a second,
  conflicting notion of availability would be a regression.
- **Material/ingredient depletion.** `StockCheck` stays exactly as it is (D14).
- **Low-stock alerts and reorder thresholds** for sellable items. `Material` has
  `minimum_stock` / `normal_stock`; sellable items get neither in this PRD.
- **Reporting on sold-out time** ("Choco was unavailable for 3 hours yesterday"). The phase-14
  ledger makes it computable later.
- **Per-station or per-daypart availability** (breakfast menu only until 11:00).

---

## Deferred

- **Cross-product shared pools** — one "vanilla syrup" counter shared by Es Kopi Susu and Es Teh
  Vanilla. Option B is the migration target; `stock_tracking` maps onto pools mechanically when it
  is needed.
- **Material-driven advisory availability** — when a material's latest `StockCheck` reads zero,
  *suggest* on the Stock screen that the variants using it be switched off, without switching them
  off automatically. Keeps the human in the loop while using the recipe data that already exists
  (`VariantMaterial`).
- **A daily target with one-tap restore** — the additive answer if D11's morning entry proves a
  burden.

---

## Open Questions

1. **`/stock` vs `/availability` as the route and sidebar label**, given `/stock-checks` already
   exists and means something else. This PRD uses `/stock`; a reviewer may reasonably prefer
   `Availability`, which is what the screen actually controls for untracked items.
2. **Should `stock_tracking` default to `variant` for newly created products?** This PRD keeps
   `none` — least surprise, and matches Square, where counting is opt-in per variation.
3. **Should the POS grid hide sold-out items behind a filter?** They are always shown today per
   the acceptance criteria; if the grid gets noisy at the end of a busy day, a "Hide sold out"
   toggle for POS only (never the customer app) is the smallest answer.

---

## Success Criteria

- A customer cannot complete an order for an item the kitchen cannot make, except through the
  deliberate paid-late path (D7).
- Taking Es Kopi Susu Vanilla off the menu is one switch, takes effect in the order app on the next
  menu load, and leaves Banana and Hazelnut untouched.
- Setting the day's Pancong and Soft Cookies numbers is one screen, reachable in one tap, and takes
  under a minute.
- Every sold-out item is still visible in both apps, labelled, and never silently missing.
- `StockCheck` behaviour is byte-for-byte unchanged.

---

## Sources

- [Mark items and modifiers as sold out — Square Support Center](https://squareup.com/help/us/en/article/8430-mark-items-and-modifiers-as-sold-out)
- [Monitor Sold-out Item Variations or Modifiers — Square Developer](https://developer.squareup.com/docs/inventory-api/monitor-sold-out-status-on-item-variation)
- [Adjust inventory levels / set up inventory tracking — Square Support Center](https://squareup.com/help/us/en/article/8331-set-up-inventory-tracking)
- [Set Stock Status and Update Inventory Count in the Menu Builder — Toast](https://support.toasttab.com/en/article/Setting-the-Stock-Status-and-Count-for-Menu-Items)
- [86 an Item on the POS or Toast Web — Toast](https://support.toasttab.com/en/article/86-an-Item)
- [Menu item inventory overview — Toast platform docs](https://doc.toasttab.com/doc/platformguide/adminMenuItemInventoryOverview.html)
