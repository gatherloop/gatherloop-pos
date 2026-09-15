# PRD: Order Fulfilment Status — Closing the Loop Between the Barista and the Guest

**Status:** Draft for review — revised once, see below
**Scope:** the half of the order-app flow that runs *after* payment succeeds — the barista
marking an order ready, and the guest finding out.

---

## Revision note (first review pass)

Two changes, both from review feedback, both recorded as new decisions rather than edited into
the originals:

1. **The guest never sees how long they have been waiting.** The first draft put an elapsed
   counter (*"Sudah 4 menit"*) on the preparing screen as the running indicator. A counter gets
   worse the longer it runs, and real preparation regularly runs long — the indicator meant to
   reassure would have been the thing making people anxious. **D11 is superseded by D17:** the
   guest gets motion with no duration attached; elapsed time moves to the staff side, where
   it is the input to a decision rather than a source of dread.

2. **Fulfilment is recorded per transaction item, not per transaction.** The first draft put
   `completed_at` on `transactions` alone. That does not survive contact with a KDS, because this
   venue is *already* two stations: `buildOrderSlipPayload` (`libs/ui/src/utils/print.ts:103`)
   splits every transaction into a `BAR` slip and a `KITCHEN` slip by
   `variant.product.category.station`, and `categories.station` has existed since migration
   `000015_add_category_station`. One flag on the transaction cannot express *bar done, kitchen
   still cooking*, which is the first thing two KDS screens will need to say. **D1 is amended by
   D18:** the timestamp lands on `transaction_items`, with a maintained roll-up on `transactions`
   so the POS list query stays a single indexed predicate. See
   [Designing for a future KDS](#designing-for-a-future-kds).

Neither change moves the phase count or alters the guest-facing contract.

---

## Problem Statement

[`docs/prd-table-ordering.md`](./prd-table-ordering.md) and
[`docs/prd-order-checkout-qris-doku.md`](./prd-order-checkout-qris-doku.md) delivered a
complete ordering path: a guest scans the table QR, browses the menu, builds a cart, pays by
QRIS through DOKU, and lands on `/t/{code}/status?ref={partnerReferenceNo}`. The POS sees the
result as a paid transaction with `source = 'order'`, badged `Order` in the list
(`libs/ui/src/presentation/views/components/transactions/TransactionListItem.tsx`), and the
barista can print an order slip from the row menu.

Then the flow stops dead.

**On the guest's side,** `OrderStatusScreen`'s `loaded` variant
(`libs/ui/src/presentation/views/screens/order/OrderStatusScreen.tsx`) renders a green check, the
words *"Pesanan Anda sedang disiapkan"*, the table label, the item list, and a **Pesan lagi**
button. That screen is static. It says "being prepared" the second the payment clears and it
still says "being prepared" twenty minutes later, because nothing on the server can ever change
it. `OrderStatusUsecase` (`libs/ui/src/domain/usecases/orderStatus.ts`) stops polling the moment
it reaches `loaded` — its `onStateChange` clears the `setInterval` in the `.otherwise` branch —
so even if the answer existed, the page would not ask for it.

**On the barista's side,** there is no way to record that an order is done.
`apps/api/presentation/restapi/transaction_route.go` exposes `pay`, `unpay`, `create`, `update`,
`delete` and the two read routes. None of them mean "this order is ready for pickup." A guest's
transaction is already `paid` at the instant it is created (QRIS clears before the transaction
is written), so the one status the POS *does* track is saturated on arrival: every order-app
transaction is paid, and the paid/unpaid filter in the transaction list separates nothing useful.

**The consequence today** is that fulfilment is communicated by shouting. The barista finishes a
drink, looks at the printed slip, and calls out a name across the room. The guest, meanwhile, is
staring at a page that has told them the same thing since they paid, and has no reason to believe
it is still true — which is exactly the anxiety that makes people walk up to the counter and ask,
recreating the queue the order app was built to remove.

**It is also a correctness problem for the barista.** Order-app transactions arrive silently —
no counter interaction, no verbal handoff. The only thing distinguishing "three orders I have not
started" from "three orders I finished an hour ago" in the transaction list is the barista's
memory of the printed slips. There is no list the barista can open that answers *what is
outstanding right now*.

### Root cause

The system models **payment** but not **fulfilment**. `transactions.paid_at` records that money
moved; nothing records that food and drink moved. In the POS-native flow the two were
indistinguishable in practice — a cashier takes payment and hands over the order in one
interaction — so a single timestamp was enough. Table ordering split that interaction in two and
put ten to twenty minutes and a physical room between the halves, and the data model never
followed.

---

## How the Industry Handles This

Every table-ordering product that reached production solves this with a **staff-driven state
transition plus a customer-visible status view**, and they differ mainly in how the customer
learns about the transition.

- **Starbucks (mobile order & pay)** — the order moves through *Received → Preparing → Ready*,
  driven by a barista tap on the store display. The customer's app shows the current stage and an
  order number they read aloud at the handoff counter. No table delivery; pickup is on the
  customer.
- **McDonald's kiosk / table service** — an order number is printed and shown on an overhead
  display; the "ready" event is the number moving from the left column to the right.
- **pesan.app, Nusa POS and the Indonesian QR-ordering cohort** — the pattern this app already
  imitates. The guest's status page polls, and a staff member marks the order *selesai* from the
  merchant dashboard. The status page is the notification channel; there is no push.
- **Toast / Square KDS** — a dedicated kitchen display with a per-ticket **Bump** button. The bump
  is the state transition; customer notification is a separate, optional SMS integration.

Two things are consistent across all of them. First, **the transition is a human action, never a
timer** — no one has shipped a credible "ready in 8 minutes" estimate for a café, because prep
time varies more than the estimate is worth. Second, **the customer-facing artefact is an order
number**, big enough to read across a counter, because that is what the handoff conversation is
actually about.

---

## Alternatives Considered

### How the guest learns the order is ready

**Option A — Keep the existing physical pager / name-calling; add nothing.**

- ✅ Zero engineering cost.
- ❌ Leaves the status page permanently lying, which is worse than not having it.
- ❌ Does not give the barista an outstanding-orders list, so the "forgotten order" failure mode
  in the acceptance criteria stays open.
- ❌ Pagers are POS-flow hardware handed over at the counter; an order-app guest never visits the
  counter before pickup, so there is no moment to hand one over.

**Option B — Barista marks the transaction complete; the guest's open page polls for it.**
**← Recommended**

- ✅ Reuses every mechanism already in the codebase: a status column on `transactions`, a
  `PUT` route shaped like `pay`/`unpay`, and a poll loop that `OrderStatusUsecase` already
  implements and merely stops too early.
- ✅ Works with no permissions prompt, no service worker, no account, no device registration —
  the constraint that made this an anonymous web app in the first place.
- ✅ The barista gets the outstanding-orders filter as a direct consequence of the same column.
- ❌ Only reaches a guest whose tab is still open. Mitigated by the leave-confirmation dialog
  (FR-7) and the resume pointer (FR-8), and honestly bounded: the guest is sitting at a table
  ten metres away.
- ❌ Polling costs one request per guest per interval. Bounded by D9 and cheap — a `preparing`
  poll is a single indexed read with no gateway call (`GetPaymentStatus` only re-queries DOKU
  while the payment is `pending`).

**Option C — Real-time push: WebSocket, SSE, or Web Push notifications.**

- ✅ Instant, and survives a backgrounded tab (Web Push survives a *closed* tab).
- ❌ `apps/api` is a stateless `net/http` + `gorilla/mux` service behind the VPS deployment in
  [`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md); long-lived
  connections are a new operational shape, not a feature.
- ❌ Web Push needs a permission prompt, VAPID key management and a service worker in an app
  whose entire premise is that a stranger can use it in four seconds with no commitment. The
  prompt would fire at the worst possible moment — right after payment.
- ❌ Every product surveyed above ships the polling version; several never ship anything else.

**Verdict: Option B.** Option C is a legitimate follow-up once the polling version has proven the
product, and nothing in this PRD forecloses it — the guest-facing state is read through one
endpoint, so swapping the transport later touches `OrderStatusUsecase` and nothing else.

### Where the fulfilment state lives

**Option D — A nullable `completed_at` timestamp on `transactions`. ← Recommended**
**Option E — A `fulfillment_status` VARCHAR enum column on `transactions`.**
**Option F — A separate `order_fulfillments` table keyed by `transaction_id`.**

D wins on precedent and on information content: `paid_at` and `deleted_at` already encode
"a thing happened, and when", the whole codebase reads them as nullable timestamps, and
*when* an order was finished is a number the operator will eventually want (prep-time
statistics) while an enum throws it away. F buys a state history nobody has asked for, at the
cost of a join on the hottest list query in the POS. See D1.

*Revised:* the **grain** of option D moved from the transaction to the transaction item after the
first review — the choice of a timestamp over E and F is unaffected, and is what makes that move
cheap. See D18.

---

## Proposed Solution

### FR-1 — `completed_at`, on items with a roll-up on the transaction

Two nullable timestamps, at two grains (D18):

- **`transaction_items.completed_at`** — the truth. One item, one station, one moment it was
  finished. This is the grain the venue already works at: the kitchen slip and the bar slip are
  disjoint sets of items from the same transaction.
- **`transactions.completed_at`** — a roll-up maintained in the same DB transaction as any write
  to the item timestamps: set to the latest item completion when every item is complete, cleared
  to `NULL` the moment any item is not. Never written independently, never the thing a caller
  updates directly.

Both are exposed on the API contract (`TransactionItem.completedAt`, `Transaction.completedAt`)
and are `null` for all existing rows after the migration.

The derived status, read from the roll-up, used in both UIs and never stored:

| `transactions.completed_at` | Fulfilment status | POS label | Order-app copy |
| --- | --- | --- | --- |
| `NULL` | `preparing` | `Preparing` | `Sedang disiapkan` |
| set | `ready` | `Ready` | `Siap diambil` |

A third value, `partially_ready`, is declared in the contract enum from day one and never emitted
until something wants it — see D20.

Fulfilment is **only defined for `source = 'order'`** (D2). A POS transaction is handed over
across the counter in the same interaction that pays for it; it has no preparation window to
track, and `completed_at` stays `NULL` on it forever without meaning "outstanding".

### FR-2 — Complete and uncomplete endpoints

```
PUT /transactions/{transactionId}/complete
PUT /transactions/{transactionId}/uncomplete
```

Both behind `CheckAuth`, both returning `SuccessResponse`, both shaped exactly like the existing
`/pay` and `/unpay` routes in `apps/api/presentation/restapi/transaction_route.go`.

`CompleteTransaction` stamps **every** item of the transaction and then recomputes the roll-up,
inside one `BeginTransaction` callback. Its guards, each returning `domain.BadRequest` so
`ToErrorCode` maps it to a 4xx:

1. the transaction exists and is not soft-deleted (`NotFound` otherwise);
2. `Source == TransactionSourceOrder` — completing a POS transaction is meaningless;
3. the roll-up is `nil` — completing twice is a no-op the caller should know about.

`UncompleteTransaction` mirrors it: clears every item timestamp, clears the roll-up, and requires
the roll-up to be set. Neither touches wallets, balances or stock: fulfilment is orthogonal to
the money, which `pay`/`unpay` already own.

These two are the only writers of the item timestamps in this PRD, and they always write all
items at once — the per-item and per-station endpoints a KDS needs are additive on top of the
same columns and the same roll-up rule (D18).

### FR-3 — `fulfillment` filter on the transaction list

`GET /transactions` gains `fulfillment=preparing|ready|all` (default `all`). A non-`all` value
adds `source = 'order'` to the query on top of the `completed_at` predicate (D5), so
`fulfillment=preparing` answers exactly the barista's question — *which guest orders have I not
finished?* — and never floods the result with POS rows that were never preparing in the first
place.

### FR-4 — The payment response carries the number and the status

`Payment` in `libs/api-contract/src/api.yaml` gains two required fields:

- `transactionNumber` (`integer, int64`) — the daily number from
  [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md), which the guest
  reads aloud at the counter;
- `fulfillmentStatus` (`preparing | ready`).

Both are derived in `ToApiPayment` (`apps/api/presentation/restapi/payment_transformer.go`) from
the `domain.Transaction` that `PaymentUsecase.GetPaymentStatus` **already loads and already
passes in**. No new query, no new repository method, and no new exposure surface: the guest is
authorised for this payment by session, and the transformer keeps choosing field by field what
leaves the building (D7).

### FR-5 — POS surfaces the status next to the source badge

In `TransactionListItem`, a fulfilment badge renders in the same `YStack` as the existing
`OrderBadge`, immediately beside it, and only when `source === 'order'`:

- `Preparing` — `$orange5` / `$orange11`, matching `OrderBadge`'s shape exactly;
- `Ready` — `$green5` / `$green11`.

A `Preparing` badge also carries the **ticket age** — `Preparing · 14m`, from `createdAt`. This is
the same number the first draft put on the guest's screen and D17 removed from it: on the
barista's side it is the input to *which order do I make next*, and it is what a KDS queue will
sort and colour by (D17, D19).

`TransactionDetail` gains the same status as one more `Card` row in its stack, alongside the
existing `MapPin` table row and `ConciergeBell` pager row, with the completion time when there is
one.

### FR-6 — The barista marks an order complete

Two entry points, because the acceptance criteria name both:

- **From the list row menu** — `Mark as Ready` (shown when `source === 'order' && !completedAt`)
  and `Mark as Preparing` (shown when `source === 'order' && completedAt`), sitting above
  `Print Order Slip`.
- **From the detail screen** — a primary button under the item list, so the barista can check
  the items against what they made and then mark it ready without going back.

Both open a `TransactionCompleteAlert`, modelled on `TransactionUnpayAlert`, and both are driven
by one `TransactionCompleteUsecase` — a confirm-and-act machine shaped like
`TransactionUnpayUsecase` (`hidden → shown → completing → completingSuccess | completingError`).
Success toasts and refetches the list, exactly as `TransactionDeleteUsecase` does today in
`TransactionListHandler`.

### FR-7 — The guest's status page, while preparing and when ready

`OrderStatusScreen`'s single `loaded` variant splits into two.

**`preparing`** — the screen the guest stares at for ten minutes, so it earns the hierarchy:

1. **The transaction number, as the largest element on the screen** — `#12` at `$12`, in a
   filled badge, above everything else. This is the thing the guest will be asked for.
2. **A running indicator carrying no duration** (D17) — a ring pulsing continuously around the
   number badge, an animated ellipsis on *"Sedang disiapkan…"*, and a small dot that flashes on
   each successful poll. Motion proves the page is live; none of it says, or implies, how long
   the guest has waited or has left to wait.
3. **Table label**, then the ordered items with options, notes and subtotals (the block that
   exists today).
4. **The waiting message** — *"Pesanan Anda sedang disiapkan. Mohon tunggu di meja Anda, kami
   akan memberi tahu di halaman ini saat pesanan siap diambil."*
5. **A help affordance after a long wait** — past `LONG_WAIT_THRESHOLD_MS` (20 minutes, from
   `payment.paidAt`) the message block gains *"Menunggu lebih lama dari biasanya? Tanyakan ke
   kasir dengan nomor #12."* The threshold is read from the clock but the **duration is never
   rendered** (D17): the guest gets a way to act, not a number to watch.

**`ready`** — unmistakably different at a glance: green, a filled check, the number still large,
and the instruction that is the entire point — *"Pesanan siap! Silakan ambil di kasir dengan
menyebutkan nomor #12."*

### FR-8 — Leaving the page while an order is preparing

While the state is `preparing`, and only then:

- **Closing or reloading the tab** triggers a `beforeunload` guard, producing the browser's own
  (uncustomisable) confirmation dialog.
- **Navigating in-app** — the `Pesan lagi` button, browser back — is intercepted on Next.js's
  `routeChangeStart` and raises a Tamagui `AlertDialog`: *"Pesanan #12 masih disiapkan. Kalau
  Anda keluar dari halaman ini, scan ulang QR di meja untuk kembali ke sini."* **Keluar** /
  **Tetap di sini**.

Both live in one `useLeaveConfirmation` hook in `libs/ui/src/utils/`, which is the only directory
in `libs/ui` permitted to import `next/router` (D12), with a no-op `.native.ts` sibling for the
Metro build.

### FR-9 — Getting back to a preparing order

The dialog's promise has to be true, and there is no order-history page (Out of Scope). So the
session remembers the active order: `SessionRepository` gains
`getActiveReference` / `setActiveReference` / `clearActiveReference`, written at checkout and
cleared once the guest sees `ready`. The menu screen at `/t/{code}` renders a resume banner —
*"Pesanan #12 sedang disiapkan"* — linking back to `/t/{code}/status?ref=…`, so re-scanning the
table QR is a complete recovery path (D14).

---

## Designing for a future KDS

A Kitchen Display System is not in this PRD, but it is the obvious next thing to build on top of
it, and the review question was whether this design survives it. This section is the answer, and
it is why FR-1 records fulfilment per item rather than per transaction.

### What this venue already has

The station split is not hypothetical and is not new. `categories.station` landed in migration
`000015_add_category_station` with values `BAR`, `KITCHEN` and `NONE`, it is editable from the
POS category form, and `buildOrderSlipPayload` (`libs/ui/src/utils/print.ts:103`) already uses it
to cut one transaction into two physical slips:

```ts
const toOrderSlipItems = (station: OrderSlipStation): OrderSlipItem[] =>
  transaction.items.filter(({ variant }) => variant.product.category.station === station)
```

The item → variant → product → category → station chain is already loaded and already threaded
into the POS transaction list. **A guest who orders a latte and a sandwich already generates two
tickets for two people at two machines.** A KDS is, structurally, those two slips on two screens
with a bump button instead of paper.

### What a KDS needs, and where this design leaves it

| KDS requirement | Status after this PRD |
| --- | --- |
| A queue of outstanding tickets, oldest first | **Served.** `fulfillment=preparing` (FR-3) is that query, and `idx_transactions_source_completed_at` is its index. |
| Route each item to a station | **Served, already.** `category.station`, as above. No new data. |
| Bump one station's half of an order independently | **Possible without a migration.** Item-grain timestamps (D18) express *bar done, kitchen not*; a per-station bump is a new endpoint over existing columns. |
| Ticket age, and colour thresholds on it | **Served.** `transactions.created_at`, surfaced on the POS badge by FR-5 (D17). |
| Un-bump / recall | **Served.** `uncomplete` (D4), which a per-item endpoint would narrow, not replace. |
| An intermediate "started" state | **Additive.** A second nullable timestamp, `started_at`, at whichever grain wants it. Timestamps compose; an enum column would not have (D1). |
| A partially-ready order, visible as such | **Additive.** Derivable from the item timestamps on day one; the contract already reserves the enum value (D20). |
| Who bumped it | **Additive, but not free** — see Deferred below. |
| An always-on display that refreshes itself | **Served by the same polling** the guest screen uses (D9, D16). |

### The one thing that is not free later

`completed_by_user_id` — the audit of *which barista* bumped a ticket. `CheckAuth`
(`apps/api/presentation/restapi/base_middlewares.go:61`) validates the JWT and then **discards the
claims**: it puts no user into the request context, so no handler in the codebase currently knows
who is acting. Recording an actor requires plumbing identity through that middleware first, which
is a change to every authenticated route's foundation and does not belong in a fulfilment PRD.

It is still additive rather than a rewrite — a nullable column and a context value, with no
backfill for history that was never captured — and nothing in this PRD makes it harder. Recorded
here so a KDS spec starts from it rather than discovering it.

---

## Design decisions

**D1 — Fulfilment is a nullable timestamp, not an enum and not a table.**
*Amended by D18: the grain moved from the transaction to the transaction item. The choice of a
timestamp over an enum or a side table stands, and is what makes the KDS additions in D18 and
D20 additive.*
`completed_at TIMESTAMP NULL`, following `paid_at` and `deleted_at`, which every
repository, transformer and screen in the codebase already reads as "did it happen, and when".
The timestamp also preserves the prep duration, which a status enum discards and which is the
obvious next operator question after this ships.
*Alternative rejected:* a separate `order_fulfillments` table — it buys a state history nobody
asked for at the price of a join on `GetTransactionList`, the hottest query in the POS.

**D2 — Fulfilment applies only to `source = 'order'`.**
A POS transaction is paid and handed over in one counter interaction; giving it a preparation
state would put every historical POS row into the barista's outstanding list. The guard lives in
the Go use case (FR-2), not only in the UI, so a stray API call cannot create a state that means
nothing.

**D3 — `complete` is its own endpoint, not a field on `PUT /transactions/{id}`.**
That route takes a full `TransactionRequest` and rewrites items, coupons and totals; routing a
one-tap barista action through it means a read-modify-write race against a cashier editing the
same transaction. `pay`/`unpay` already established the narrow-verb-route precedent for exactly
this reason.

**D4 — `uncomplete` ships with `complete`, in the same PR.**
A mis-tap on a list row is the single most likely thing to go wrong here, and without an undo the
only remedy is a `UPDATE` against production MySQL. The endpoint, the use case guard and the menu
item together are under fifty lines and share every test fixture with `complete`; splitting them
would mean shipping a known trap and calling it a phase.

**D5 — A non-`all` `fulfillment` filter implies `source = 'order'`.**
`completed_at IS NULL` is true of every POS transaction ever written, so a filter that did not
narrow by source would answer a question no one asked. Server-side, not just in the UI, so the
contract means one thing everywhere.
*Alternative rejected:* treating POS rows as implicitly `ready` — it makes `fulfillment=ready`
return thousands of counter sales and reads as an assertion about POS orders that the data does
not support.

**D6 — The guest reads fulfilment through `/payments/{ref}`, never `/transactions/{id}`.**
`GET /payments/{partnerReferenceNo}` is already the guest's authorised, session-scoped window
onto their order, already 404s when the payment belongs to another session, and already loads the
transaction. `/transactions/**` is behind `CheckAuth` and must stay staff-only. No new public
route is introduced by this PRD.

**D7 — `Payment` gains two scalar fields, not an embedded `Transaction`.**
`ToApiPayment` is a hand-written allowlist — it copies eight fields and builds an item list, and
that is exactly why no `walletId`, `totalIncome` or coupon ever leaks to a guest's phone. Adding
`transactionNumber` and `fulfillmentStatus` keeps the allowlist property; embedding the
transaction would invert it and make every future column on `transactions` guest-visible by
default.

**D8 — `OrderStatusUsecase` gets two states, not a flag in `Context`.**
`loaded` splits into `preparing` and `ready`. The polling lifecycle is *per state* —
`onStateChange` starts an interval in `awaitingPayment` and clears it in `.otherwise` — so a
boolean in context would mean the `.otherwise` branch stops the loop for the state that needs it
most. Two states also make `OrderStatusScreen`'s `match(...).exhaustive()` prove at compile time
that both render something, and make the transition testable with `UsecaseTester` as one explicit
step.
*Alternative rejected:* a `isReady` flag on `Context` — it type-checks and silently never polls.

**D9 — Preparation polls every 10s; payment keeps its 3s.**
A guest watching a QR code wants sub-5s feedback and the window is bounded by expiry; a guest
waiting for a latte does not perceive 10s of latency, and the window is ten to twenty minutes —
3s would be ~300 requests per guest per order. Both intervals are named constants in
`orderStatus.ts` so the trade-off is visible at the point of change. The `preparing` poll is a
single indexed read: `GetPaymentStatus` only re-queries DOKU while the payment is `pending`.

**D10 — `ready` is terminal.**
Once the guest has been told to collect, the page stops polling and stops changing. A barista's
`uncomplete` after that point is a correction to the *record*, not a recall of the guest, who is
already walking to the counter; flipping the screen back to `preparing` under them would be
actively harmful. `OrderStatusUsecase` clears its interval on entering `ready` via the existing
`.otherwise` branch, so this is the default behaviour rather than added code.

**D11 — ~~The running indicator is elapsed time and a pulse~~. Superseded by D17.**
The original reasoning — that a countdown needs a prep-time estimate this system does not have,
and that a wrong one turns a waiting guest into a complaining one the moment it hits zero — still
holds, and D17 keeps it. What D17 rejects is the other half: that an elapsed counter is a safe
alternative because it is "always honest". Honest and kind are different properties.

**D12 — The leave guard lives in `libs/ui/src/utils/`, with a `.native.ts` no-op.**
`beforeunload` and `router.events` are browser and Next.js APIs, and `.eslintrc.json` bans `next`
and `next/router` from `handlers/`, `handlers/hooks/`, `views/components/`, `views/screens/` and
`app/` with the message *"libs/ui is Metro-bundled for apps/pos-mobile; Next has no business
outside utils/"*. `utils/queryParam.ts` / `queryParam.native.ts` is the existing precedent for
exactly this split. The hook returns `{ isConfirmOpen, onLeaveConfirm, onLeaveCancel }`; the
handler maps that to screen props and the screen renders the dialog, so the layer rule holds.
`docs/handlers.md` gains a line recording that browser-lifecycle guards are `utils/`, not
`handlers/hooks/`.

**D13 — The leave dialog does not mention an order-history page.**
The obvious copy — *"you can find this order in your order history"* — would be a lie until that
page exists. The dialog promises what FR-9 actually delivers: re-scan the table QR. The copy
changes in the same PR as the history page, whenever that is.

**D14 — The active reference lives in the session, and the menu offers to resume.**
The status URL carries the reference in a query parameter; navigate away and it is gone. The
session already persists `tableCode` through `CookieSessionRepository` with a localStorage
fallback, and the same mechanism carries the active reference. This is the minimum that makes
"leave and come back" work without building order history, and it is what the history page will
read from later anyway.

**D15 — POS copy is English, order-app copy is Indonesian.**
Not a new decision, a constraint being honoured: every string in `views/screens/pos/**` is
English (`Print Order Slip`, `Payment Status`) and every string in `views/screens/order/**` is
Indonesian (`Pesanan Anda sedang disiapkan`, `Kembali ke menu`). This feature spans both and must
not blur that line.

**D16 — No push, no WebSocket, no SSE in this PRD.**
See Option C. Recorded here so the next person does not re-open it without the operational
argument.

**D17 — The guest sees motion, never a duration. Elapsed time is a staff-side number.**
*Supersedes D11.* A counter on the guest's screen is a number that gets worse the longer it runs,
on a wait whose length the guest cannot influence and the venue cannot reliably bound —
preparation genuinely runs long at peak, and that is exactly when the counter is largest and the
guest is least happy to read it. The indicator's job is to prove the page is not frozen, and that
needs motion, not measurement: a pulsing ring, an animated ellipsis, and a dot that flashes on
each successful poll all do it with no number attached.

The same elapsed time is genuinely useful one metre away, on the barista's side, where it answers
*which order do I make next* and is what a KDS queue sorts and colours by — so it moves there
(FR-5) rather than being discarded. The guest's only remaining use of the clock is invisible: the
20-minute help affordance in FR-7, which turns a long wait into an action rather than a display.
*Alternative rejected:* a progress bar that fills over an assumed prep time — it is a countdown
wearing a different hat, and it lies with more confidence than a counter does.

**D18 — `completed_at` lives on `transaction_items`, with a maintained roll-up on
`transactions`.** *Amends D1.* This venue is already two stations — `buildOrderSlipPayload` cuts
every transaction into a `BAR` slip and a `KITCHEN` slip by `category.station`, and has since
migration `000015`. A single flag on the transaction cannot say *bar done, kitchen still
cooking*, which is the first sentence two KDS screens will need to speak. Putting the timestamp
at the grain the stations already work at makes a KDS an additive endpoint over existing columns
instead of a migration plus a rewrite of every reader.

The roll-up on `transactions` is kept rather than derived on read because
`fulfillment=preparing` (FR-3) runs against `GetTransactionList`, the hottest query in the POS;
`EXISTS (SELECT 1 FROM transaction_items …)` on every page load is a real cost for a value that
changes a handful of times a day. Two representations, one writer: the roll-up is recomputed in
the same `BeginTransaction` callback as any item write and is never set independently.

*Alternative rejected — transaction-grain now, migrate later.* It is backfillable (copy the
transaction timestamp down onto its items), so it is not a trap in the data. It is a trap in the
code: by then `completed_at` is read by two screens, a filter, a transformer and the payment
response, and every one of them moves. The cost of doing it now is one extra column, one roll-up
helper and its tests — a phase, not a project.

**D19 — The station is the KDS unit of work, and it already exists.**
No station modelling belongs in this PRD: `categories.station` is populated, editable from the
POS, and already drives the two-slip print. This PRD neither extends nor depends on it — it only
declines to design something that would contradict it. Recorded so a KDS spec knows the routing
question is settled and the remaining work is a per-station query and a bump endpoint.

**D20 — The fulfilment enum declares `partially_ready` from day one and never emits it.**
`preparing | partially_ready | ready` in `api.yaml`, with the API emitting only the first and
last until something wants the middle. The frontend's `match(...).exhaustive()` handles all three
immediately, mapping `partially_ready` onto the preparing screen. The value costs one enum entry
and one match arm today; discovering it later means widening an enum that four exhaustive matches
depend on, in the same PR as the feature that needs it. With item-grain timestamps (D18) the
state is real from the first day — it simply has no UI yet.

---

## Phased plan

Each phase is one PR, leaves `main` green and the product shippable on its own, and names its own
acceptance check.

| # | Phase | Layer | Depends on |
| --- | --- | --- | --- |
| 1 | `completed_at` on items and transactions | API | — |
| 2 | Complete / uncomplete endpoints + roll-up | API | 1 |
| 3 | `fulfillment` list filter | API | 1 |
| 4 | Payment response carries number + status | API | 1 |
| 5 | Frontend transaction slice: entity, repository, use case | libs/ui | 2 |
| 6 | POS shows the fulfilment badge | POS | 5 |
| 7 | POS marks an order ready | POS | 5, 6 |
| 8 | POS filters by fulfilment | POS | 3, 5 |
| 9 | Order app: payment entity + status machine split | order | 4 |
| 10 | Order app: preparing and ready screens | order | 9 |
| 11 | Leave confirmation while preparing | order | 10 |
| 12 | Resume the active order from the menu | order | 10 |
| 13 | Docs site and e2e coverage | docs, e2e | 7, 8, 10 |

Phases 2, 3 and 4 are independent of each other and can land in parallel once 1 is in. The POS
track (6–8) and the order track (9–12) are independent of each other.

> Every phase that touches `libs/api-contract/src/api.yaml` regenerates both clients
> (`npx nx run api-contract:generate:go`, `npx nx run api-contract:generate:ts`) and may need the
> new symbol added to `libs/ui/src/__mocks__/api-contract.ts`, which Jest substitutes wholesale
> for the generated package.

---

### Phase 1 — `completed_at` on items and transactions (API)

Migration `000028_add_fulfillment_completed_at` (next free number; `000027_add_transaction_number`
is the latest) adding `completed_at TIMESTAMP NULL` to **both** `transaction_items` and
`transactions` (the latter `AFTER paid_at`), plus
`KEY idx_transactions_source_completed_at (source, completed_at)` — the composite index the
Phase 3 filter needs — with a `down` that drops all three. `CompletedAt *time.Time` on
`Transaction` and `TransactionItem` in `apps/api/domain/transaction_entity.go` and
`apps/api/data/mysql/transaction_entity.go`, carried through
`apps/api/data/mysql/transaction_transformer.go` and
`apps/api/presentation/restapi/transaction_transformer.go`, and `completedAt` (optional,
`date-time`) on both the `Transaction` and `TransactionItem` schemas in `api.yaml`. No behaviour
change — nothing writes either column yet.

**Acceptance:** `npx nx run api:test` green;
`MIGRATIONS_DIR=data/mysql/migrations make migrate-up && make migrate-down` clean both ways;
`GET /transactions` omits `completedAt` at both levels for every existing row.

### Phase 2 — Complete and uncomplete endpoints, with the roll-up (API)

`CompleteTransaction(ctx, id)` and `UncompleteTransaction(ctx, id)` on `TransactionUsecase` with
the FR-2 guards, returning `*domain.Error`, each stamping or clearing every item and then
recomputing the transaction roll-up inside one `BeginTransaction` callback. The roll-up rule
lives in one exported helper on `apps/api/domain/transaction_entity.go` —
*latest item timestamp if every item has one, else `nil`* — so the per-station bump a KDS adds
later calls the same function rather than reimplementing the rule. Repository methods on
`TransactionRepository` implemented in `apps/api/data/mysql/transaction_repo.go`; mocks
regenerated with `go generate ./...`; handler methods, the two `PUT` routes under `CheckAuth`,
and the `api.yaml` operations with their `SuccessResponse` and 400/404 responses.

**Acceptance:** a table test over the roll-up helper covering no items, some items, all items and
the latest-timestamp pick; `transaction_usecase_test.go` covers complete, uncomplete,
double-complete, uncomplete-when-not-complete and complete-on-a-POS-transaction (each asserting
the `domain.Error` type) and asserts item timestamps and roll-up move together;
`transaction_handler_test.go` covers the two routes; `npx nx run api:test` green.

### Phase 3 — `fulfillment` list filter (API)

`TransactionFulfillment` parameter (`preparing | ready | all`) in `api.yaml`, a
`domain.TransactionFulfillment` type, and the predicate in `GetTransactionList` /
`GetTransactionListTotal` — `preparing` → `source = 'order' AND completed_at IS NULL`, `ready` →
`source = 'order' AND completed_at IS NOT NULL`, `all` → no clause — alongside the existing
`source` handling. Handler parses the query parameter with the `all`-means-nil convention the
`source` parameter already uses.

**Acceptance:** repository-level tests assert each of the three values against a fixture
containing a preparing order, a ready order and a POS transaction; the POS row appears under
neither non-`all` value. `npx nx run api:test` green.

### Phase 4 — Payment response carries the number and status (API)

`transactionNumber` and `fulfillmentStatus` added as required fields on the `Payment` schema, the
latter with all three enum values declared and only two emitted (D20), and both derived in
`ToApiPayment` from the `domain.Transaction` parameter it already receives.
`payment_transformer_test.go` gains cases for a transaction with and without a roll-up.
Nothing else in the payment path changes — `GetPaymentStatus` already returns the transaction.

**Acceptance:** `payment_transformer_test.go` covers both statuses and asserts the number is the
daily `TransactionNumber`, not the id; `npx nx run api:test` green.

### Phase 5 — Frontend transaction slice: entity, repository, use case (libs/ui)

No UI. `completedAt: string | null` on both the `Transaction` and `TransactionItem` entities, plus
`TransactionFulfillmentStatus = 'preparing' | 'partially_ready' | 'ready'` and
`TransactionFulfillmentFilter = TransactionFulfillmentStatus | 'all'` in
`libs/ui/src/domain/entities/Transaction.ts`. `completeTransaction` / `uncompleteTransaction` on
`TransactionRepository`, implemented in `data/api/transaction.ts` and `data/mock/transaction.ts`.
`TransactionCompleteUsecase` in `domain/usecases/transactionComplete.ts`, shaped like
`TransactionUnpayUsecase`, with `transactionComplete.test.ts` driving the success path via
`UsecaseTester` + `flushPromises` and the error path via `MockTransactionRepository.setShouldFail(true)`.
Barrel exports at `domain/entities`, `domain/usecases`, `data/api`, `data/mock`.

**Acceptance:** `npx nx run ui:test` green; the new use case is reachable from
`@gatherloop-pos/ui`.

### Phase 6 — POS shows the fulfilment badge (read-only)

`FulfillmentBadge` beside `OrderBadge` in `TransactionListItem`, rendered only for
`source === 'order'` and carrying the ticket age while preparing (FR-5, D17), plus the status row
in `TransactionDetail`. `completedAt` threaded from `TransactionList` → `TransactionListItem` and
from `TransactionDetailScreen` → `TransactionDetail`. Stories added for preparing, preparing-and-old
and ready in `TransactionListItem.stories.tsx`, `TransactionList.stories.tsx` and
`TransactionDetail.stories.tsx`. No action, no new use case.

**Acceptance:** Storybook (`npx nx run ui:storybook`) shows an order row badged `Preparing · 14m`,
one badged `Ready` with no age, and a POS row with neither badge; `npx nx run ui:test` green.

### Phase 7 — POS marks an order ready

`TransactionCompleteAlert` (modelled on `TransactionUnpayAlert`), the two guarded row-menu items,
the detail-screen primary button, and `TransactionCompleteUsecase` wired into
`TransactionListHandler` and `TransactionDetailHandler` — success toasts and refetches, error
toasts, following the `transactionDelete` effect block already in `TransactionListHandler`.
Composition roots `app/pos/TransactionList.tsx` and `app/pos/TransactionDetail.tsx` construct the
use case.

**Acceptance:** handler tests using real use cases over `MockTransactionRepository` assert that
pressing `Mark as Ready` on an order row and confirming flips the badge to `Ready`, that the
menu item is absent on a POS row, and that a failing repository surfaces the error without
changing the badge. `npx nx run ui:test` green.

### Phase 8 — POS filters by fulfilment

`getFulfillment` / `setFulfillment` on `TransactionListQueryRepository`, implemented in
`data/url/transactionListQuery.ts` (query parameter `fulfillment`, parsed with
`createStringUnionParser`) and `data/mock/transactionListQuery.ts`; the parameter threaded through
`TransactionListUsecase` and `TransactionRepository.fetchTransactionList`; a **Fulfilment** radio
group in the `TransactionList` filter popover, rendered under **Source**, whose non-`all` values
also set Source to `Order` in the same dispatch so the popover can never show a contradictory
pair (D5).

**Acceptance:** a handler test asserts that selecting `Preparing` requests
`fulfillment=preparing`, moves Source to `Order`, and leaves only the uncompleted order row
rendered; the selection survives a reload via the URL. `npx nx run ui:test` green.

### Phase 9 — Order app: payment entity and status machine split

`transactionNumber: number` and `fulfillmentStatus: TransactionFulfillmentStatus` on the
`Payment` entity and `toPayment` (`data/api/payment.transformer.ts`). `OrderStatusUsecase` splits
`loaded` into `preparing` and `ready`: `stateTypeForPayment` maps a `paid` payment by its
`fulfillmentStatus`; `preparing` starts a `PREPARATION_POLL_INTERVAL_MS = 10_000` interval and
handles `POLL_SUCCESS` by transitioning to `ready` when the status flips; `ready` falls into the
existing `.otherwise` branch that clears the interval (D10). `OrderStatusHandler` maps both new
states onto the existing `loaded` screen variant, so this phase is behaviour-preserving on screen.

**Acceptance:** `orderStatus.test.ts` asserts `loading → preparing → (poll) → ready` and that no
further request is made after `ready`; `npx nx run ui:test` green; the status page looks
unchanged.

### Phase 10 — Order app: preparing and ready screens

`OrderPreparingView` and `OrderReadyView` in
`libs/ui/src/presentation/views/components/orderStatus/`, with stories, implementing FR-7 — the
large transaction-number badge, the pulsing ring, the animated ellipsis and the poll-flash dot
(no duration anywhere, D17), the table label, the item list, the message block and the 20-minute
help affordance. `OrderStatusScreen`'s `loaded` variant is
replaced by `preparing` and `ready`; `OrderStatusHandler` maps the two states onto them. No
hand-written `useMemo` / `useCallback` / `React.memo` — the React Compiler owns memoisation
([`docs/trd-react-compiler-adoption.md`](./trd-react-compiler-adoption.md)).

**Acceptance:** stories for both views, including the past-threshold help affordance; a handler
test asserts that a `preparing` payment renders the number and the waiting copy, that a `ready`
payment renders the pickup instruction, and that **no elapsed duration is rendered in any state**
(D17); `npx nx run ui:test` green.

### Phase 11 — Leave confirmation while preparing

`useLeaveConfirmation(isEnabled)` in `libs/ui/src/utils/`, plus a no-op
`useLeaveConfirmation.native.ts`, registering the `beforeunload` listener and the
`routeChangeStart` interception, and returning `{ isConfirmOpen, onLeaveConfirm, onLeaveCancel }`.
`OrderLeaveConfirmAlert` in `views/components/orderStatus/` with the D13 copy.
`OrderStatusHandler` enables the hook only while the state is `preparing` and maps its return onto
screen props. One line added to `docs/handlers.md` recording that browser-lifecycle guards belong
in `utils/` (D12).

**Acceptance:** a handler test asserts the dialog opens on an attempted in-app navigation while
`preparing`, that **Tetap di sini** keeps the route, that **Keluar** allows it, and that no
dialog appears when the state is `ready`. `npx nx run ui:test` and `npx nx run ui:lint` green —
the lint run is the real check that the hook landed in a directory allowed to import
`next/router`.

### Phase 12 — Resume the active order from the menu

`getActiveReference` / `setActiveReference` / `clearActiveReference` on `SessionRepository`,
implemented in `CookieSessionRepository` on the existing localStorage helpers and covered in
`CookieSessionRepository.test.ts`. Written when `CheckoutUsecase` reaches `created`, cleared when
`OrderStatusUsecase` reaches `ready`. A resume banner on `MenuListScreen`, wired in
`MenuListHandler`, linking to `/t/{code}/status?ref=…`.

**Acceptance:** a handler test asserts the banner renders when a reference is stored and not when
it is cleared; manually, paying, navigating to the menu and re-scanning the table QR returns to
the preparing screen. `npx nx run ui:test` green.

### Phase 13 — Docs site and e2e coverage

`docs-site/sales/order-checkout.md` gains the post-payment fulfilment flow;
`docs-site/sales/transactions.md` gains the badge, the two menu actions and the filter; both are
already in the sidebar. A `pos-web-e2e` spec covering *filter to preparing → open an order → mark
ready → badge flips*, and an `order-web-e2e` spec covering *preparing screen shows the number →
status flips to ready → pickup instruction shown*.

**Acceptance:** both suites pass locally (`npx nx run pos-web-e2e:e2e`,
`npx nx run order-web-e2e:e2e`) — CI only runs Playwright post-merge
(`.github/workflows/e2e-main.yml`), so local is the only gate before merge.

---

## Risks

**A guest closes the tab anyway and never sees `ready`.** The most likely failure, and only
partly mitigable: `beforeunload` is uncustomisable, and Safari and Chrome both suppress it
without a prior user gesture on the page. FR-9's resume path is the real mitigation, and the
fallback is the status quo — the barista calls the number out loud. The number is the largest
thing on the guest's screen precisely so that fallback works.

**A barista forgets to mark orders ready, and the filter fills up.** The filter is the mitigation,
but only if someone looks at it. Worth watching after launch; a badge count on the transactions
nav item is the obvious follow-up if it turns out to be needed.

**Polling load.** ~6 requests/minute per waiting guest at D9's interval, each a single indexed
read with no gateway call. At twenty concurrent tables that is two requests per second — an order
of magnitude below anything `apps/api` currently strains at. Revisit only if concurrency grows
tenfold.

**Clock skew.** `payment.paidAt` is a server timestamp compared against the guest's device clock,
and `createdAt` likewise against the POS machine's. After D17 the guest renders no duration at
all, so skew can only mis-time the 20-minute help affordance — it appears early or late, and
nothing looks broken. The POS badge age is the visible one, and a POS terminal's clock is
operator-managed. Clamp both at zero.

**A guest with no time signal cannot tell 5 minutes from 40.** The cost of D17, accepted
deliberately. The 20-minute help affordance is the mitigation: the guest gets an action —
*ask at the counter with your number* — at the point where a wait stops being normal, without
ever being shown a number that makes the wait feel worse.

**The roll-up drifts from the item timestamps.** Two representations of one fact (D18). Contained
by there being exactly one writer — the roll-up is recomputed in the same `BeginTransaction`
callback as any item write, by one helper, and never set directly. The roll-up helper's table
test is the guard, and the item timestamps are the truth if they ever disagree.

**The `uncomplete` action confuses the guest.** Mitigated by D10 — `ready` is terminal, so a guest
already told to collect never sees the screen revert. The barista's undo fixes the record, not the
guest's page.

**Migration on large tables.** `ADD COLUMN ... NULL` on `transactions` *and* `transaction_items`
— the latter being the larger of the two — plus a composite index on a table that also carries
`idx_transactions_source`. On this deployment's row count this is seconds, but it is a
single-venue assumption worth re-checking before running it anywhere else.

---

## Out of Scope

| Not doing | Why |
| --- | --- |
| **Order history page for the guest** | Named in the acceptance criteria as explicitly deferred. FR-9's resume pointer is the minimum that keeps the leave dialog honest, and is what a history page would read from. |
| **Per-item and per-station *actions*** (bump the bar's half only) | The acceptance criteria are per-transaction, and one tap meaning "all of it" is the right barista UI today. The *data* is recorded at item grain from Phase 1 (D18), so this is a later endpoint over existing columns, not a migration. |
| **A dedicated kitchen display (KDS)** | Its own PRD. This one is designed not to obstruct it — see [Designing for a future KDS](#designing-for-a-future-kds) for what it inherits and the one thing (`completed_by_user_id`) that still needs groundwork. |
| **A `started_at` / in-progress state** | Additive later as a second timestamp (D1, D18). Nothing in the acceptance criteria distinguishes "queued" from "being made". |
| **Showing the guest a duration, ever** | D17. |
| **Push notifications, WebSocket, SSE** | D16. |
| **Prep-time estimates or countdowns** | D11. |
| **Prep-time statistics** | `completed_at - created_at` makes them possible; nothing in this PRD reports on them. |
| **Fulfilment for POS transactions** | D2. |
| **Notifying the guest of `uncomplete`** | D10. |
| **pos-mobile parity** | `libs/ui/src/app/pos/TransactionList.tsx` is shared, so the badge follows for free, but no mobile-specific work, story or test is in scope. |

---

## Open Questions

1. **Should marking ready also print something, or trigger the existing order-slip print?** The
   current flow prints the slip when the order arrives. Assumed no second print; confirm with the
   barista.
2. **Should `Mark as Ready` be reachable from the order-slip print action as one combined tap?**
   Deliberately not combined — printing happens at the start of preparation and completing at the
   end.
3. **Does the venue want a sound or a visible counter on the POS when a new order arrives?**
   Adjacent to this feature (arrival, not completion) and not covered by the acceptance criteria.
4. **How long should the resume pointer live?** Assumed: cleared on `ready`, otherwise expiring
   with the session cookie. A same-day cap may be better.
5. **Is 20 minutes the right point for the guest's help affordance (FR-7)?** Picked as roughly
   double a normal wait. It is a single constant, and the only place the guest's screen consults
   the clock at all — worth setting from the venue's real prep times once the POS badge age
   (FR-5) has been showing them for a week.
6. **Should the POS badge colour shift as a ticket ages** (amber past 15 minutes, red past 25)?
   Deliberately not specced — it is the natural companion to the badge age and the obvious thing
   a KDS would do, but it wants the same real prep-time data as question 5.

---

## Success Criteria

1. A barista can go from *"this latte is done"* to *the guest's phone says so* in two taps, and
   the guest's screen updates within 10 seconds without a reload.
2. The transaction list, filtered to `Preparing`, is a correct and complete list of outstanding
   guest orders at any moment — the artefact the barista checks before closing the bar.
3. A guest looking at the preparing screen can answer *"what is my number?"* without scrolling,
   and can see something moving that proves the page is live — without ever being shown how long
   they have been waiting.
4. A guest who navigates away is warned, and can get back by re-scanning the table QR.
5. No regression to the paid/unpaid flow: `pay`, `unpay` and their wallet-balance effects are
   untouched by every phase in this plan.
6. A future KDS PRD can add two station screens with a per-station bump without a migration, a
   contract break, or a change to how `fulfillment=preparing` is queried.

---

## Sources

- Starbucks mobile order & pay — order status stages and in-app pickup number:
  https://www.starbucks.com/rewards/mobile-order-pay/
- Toast Kitchen Display System — ticket "bump" as the fulfilment transition:
  https://pos.toasttab.com/products/kitchen-display-system
- Square KDS — order states and expo workflow:
  https://squareup.com/help/us/en/article/6595-square-kds
- pesan.app — the Indonesian QR-ordering flow this app follows:
  https://pesan.app
- MDN, `beforeunload` — why the dialog text cannot be customised and when browsers suppress it:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
