# PRD: Guest Order History

## Revision note (first review pass)

Five open questions were answered in review. Three confirmed the design as written and are recorded
under [Settled in review](#settled-in-review): the badge counts `preparing` only (D8), the guest's
name stays on the row (FR-3), and checking out while an order is preparing raises no warning.

Two changed it:

- **History lists paid orders only.** D5's inclusion of pending-and-unexpired payments is
  superseded by **D14**: an unpaid QR's recovery path is the cart, which is never cleared while a
  payment is pending, so a pending row would be a second route to something the cart already does.
  FR-1, FR-3, the Risks table and Success Criterion 4 follow.
- **The session is meant to last forever, and today it does not.** `resolveSession` issues
  `Set-Cookie` only when it mints a new id, so a returning guest's cookie counts down from their
  *first* visit and dies 365 days later whatever they do in between. **D15** makes the cookie
  rolling, raises it to the browser maximum, and names what "forever" can and cannot mean in a
  browser. This adds a phase, so the phase table is renumbered to nine; no decision number moved.

---

The order app (`apps/order-web`) can take a guest from QR scan to a paid, prepared order — but
only one order at a time, and only as long as the guest stays on one page. This PRD builds the
page that [`docs/prd-order-fulfillment-status.md`](./prd-order-fulfillment-status.md) explicitly
deferred ("Order history page for the guest" in its Out of Scope table), and removes the two
stopgaps that stood in for it: the leave-confirmation guard (that PRD's D12/FR-8) and the
single-slot resume pointer (its D14/FR-9).

It follows [`docs/prd-table-ordering.md`](./prd-table-ordering.md) (the QR flow),
[`docs/prd-order-checkout-qris-doku.md`](./prd-order-checkout-qris-doku.md) (QRIS payment),
[`docs/prd-order-app-ux-improvements.md`](./prd-order-app-ux-improvements.md) and
[`docs/prd-order-app-ux-round-2.md`](./prd-order-app-ux-round-2.md) (whose D4 — *the payment QR
lives at a URL, keyed by reference* — this PRD extends).

---

## Problem Statement

The guest flow works end to end: scan the table QR, browse the menu, fill the cart, check out with
QRIS, pay, watch `preparing`, see `ready`, collect the order. It works on the assumption that the
guest keeps one tab open on one URL for the entire preparation window.

### 1. The order status is reachable from exactly one place, and that place is fragile

A payment's durable identity is its `partnerReferenceNo`, and it is carried only in a query
parameter: `apps/order-web/src/pages/t/[code]/status.tsx` reads `ctx.query.ref` and server-renders
the payment. Nothing else in the product knows that reference. Close the tab, and the guest has no
way to type, guess or find that URL again.

Two mechanisms were built to compensate, and each is a symptom:

- **A leave guard.** `OrderStatusHandler.tsx:32` calls
  `useLeaveConfirmation(orderStatus.state.type === 'preparing')`, and
  `libs/ui/src/utils/useLeaveConfirmation.ts` registers a `beforeunload` listener *and* intercepts
  Next's `routeChangeStart` — by **throwing** out of the event handler (`ROUTE_CHANGE_ABORTED`)
  after re-emitting `routeChangeError`, then raising a Tamagui dialog. The guest is stopped at the
  door of every in-app navigation, including the one button the screen itself offers
  (`onBackToMenuPress`).
- **A one-slot resume pointer.** `SessionRepository` carries
  `getActiveReference` / `setActiveReference` / `clearActiveReference`
  (`libs/ui/src/domain/repositories/session.ts:5-7`), persisted to `localStorage` under
  `gl_active_reference` (`libs/ui/src/data/session/constants.ts:4`). `CartHandler.tsx:70` writes it
  at checkout; `OrderStatusHandler.tsx:44` clears it when the state reaches `ready`;
  `MenuListHandler.tsx:124-125` reads it once and renders `ResumeOrderBanner` — *"Pesanan Anda
  sedang disiapkan"* — linking back to `/t/{code}/status?ref=…`.

### 2. One slot means one order

`ACTIVE_REFERENCE_STORAGE_KEY` holds a single string. A guest who orders coffee, then wants
a second round while the first is still being made, overwrites the pointer to their first order at
`CartHandler.tsx:70` the moment the second checkout succeeds. The first order's reference is gone
from the device while its food is still on the pass. The banner's copy is singular for the same
reason — it can only ever describe one order.

The guard makes this worse rather than better: the guest who wants to order again is told
*"Pesanan #12 masih disiapkan. Kalau Anda keluar dari halaman ini, scan ulang QR di meja untuk
kembali ke sini."* — a dialog that reads as a prohibition on ordering more.

### 3. The data model already disagrees with the UI

Nothing on the server restricts a session to one order:

- `payments.session_id CHAR(36) NOT NULL` with `KEY idx_payments_session_id (session_id)`
  (`apps/api/data/mysql/migrations/000025_create_payments.up.sql`) — every payment a session has
  ever made is already indexed by that session.
- Ownership is already enforced per payment: `payment_usecase.go:309-311` returns `NotFound` when
  `payment.SessionId != sessionId`, and the route is wrapped in `RequireSessionId`
  (`base_middlewares.go:99`), which validates the `X-Session-Id` header against a UUIDv4 pattern.
- A paid order frees the cart: `payment_usecase.go:261` sets `cart.Status = CartStatusConverted`
  on confirmation, so the next `GetActiveCartBySessionId` mints a fresh cart. **Ordering again
  while a previous order is preparing already works** at the data layer — it is the frontend that
  forbids it.
- The session id itself is table-independent and long-lived: `CookieSessionRepository` reconciles a
  cookie against `localStorage` with `SESSION_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365`, and
  `setTableCode` is a *separate* key. Scanning a different table's QR changes `gl_table_code` and
  never touches the session id.

**Root cause.** The product models "the guest's current order" as a device-local pointer, when the
server already models "the guest's orders" as a session-scoped collection. Every symptom above —
the guard, the singular banner, the lost first order, the prohibition on re-ordering — is that one
missing list, worked around three different ways.

---

## How the Industry Handles This

- **Starbucks Mobile Order & Pay** puts the in-progress order on the home screen as a persistent
  card and keeps every past order under "Recent orders"; the app never blocks navigation while an
  order is being made.
- **McDonald's app / kiosks** hand the guest an order number and a status board. The app's
  "Recent orders" tab is the durable record; the live status is one row in it.
- **GoFood / GrabFood (ID)** run multiple concurrent orders per account with a persistent
  "Pesanan" tab in the bottom navigation, badged with the number of orders in flight.
- **pesan.app**, the Indonesian QR-ordering product this app follows, keys the guest's history to
  the browser session — no login — and shows it from a header entry point on every screen.

The convergent pattern: **the live order is a row in a list, not a page you are held on.** None of
them uses a `beforeunload` guard; all of them use a persistent, badged entry point.

---

## Alternatives Considered

### Option A — Keep the device pointer, widen it to an array

Store a list of references in `localStorage` instead of one, and render them all in a banner or a
sheet.

- ✅ No API work; ships in one frontend PR.
- ❌ The list is only as good as the device. Cleared storage, private browsing, or the user
  switching from the in-app browser to Chrome loses the history while the server still has it.
- ❌ Every entry still needs `/payments/{ref}` fetched individually to render a status, so the
  "cheap" option is N requests to paint one screen.
- ❌ It re-implements server state on the client, and the two drift: a reference the server has
  expired stays in the array forever.

### Option B — Session-scoped list endpoint, with the existing payment detail as the row target ✅ **Recommended**

Add `GET /payments`, scoped to the requesting session by the same rule
`GetPaymentStatus` already applies, returning a compact summary per payment. The frontend gets an
order-history screen; each row links to the payment's own durable URL, which is the status page
that already exists.

- ✅ The server is the source of truth, so history survives cleared `localStorage` as long as the
  session cookie lives, and cannot drift from payment state.
- ✅ One request paints the whole list.
- ✅ The row target is a page that already renders a payment in every state it can reach — pending
  QR, preparing, ready — so "see the items I chose" is delivered by reuse, not by a new screen.
  (D14 later narrows which of those states a *row* can point at; the page keeps all of them.)
- ✅ Deletes code: the leave guard, its `.native.ts` sibling, the alert component, the resume
  banner and three `SessionRepository` methods all go.
- ❌ Requires an API phase before any of the frontend lands.

### Option C — Guest accounts (phone number or email), history keyed to an identity

- ✅ History would survive a device change, which Option B's cannot.
- ❌ Adds a login wall in front of a flow whose entire value is *scan and order* — the one thing
  `docs/prd-table-ordering.md` set out to avoid.
- ❌ Needs OTP delivery, a customers-to-identity migration, and a privacy posture this product does
  not currently have.
- ❌ Solves a problem (cross-device history) nobody in the acceptance criteria asked for.

**Recommended: Option B.** Option A is cheaper for one sprint and wrong forever; Option C is the
right shape for a loyalty product and the wrong shape for a QR menu. Option B is the only one that
removes code rather than adding a second copy of state the server already holds.

---

## Proposed Solution

### FR-1 — `GET /payments` lists the requesting session's orders

A new endpoint next to the two that exist, session-scoped by the same header and middleware:

```
GET /payments?limit=20&skip=0        (X-Session-Id required)
→ { data: PaymentSummary[], meta: { total } }
```

`PaymentSummary` carries exactly what a row needs and nothing that costs a join per item:
`partnerReferenceNo`, `status`, `fulfillmentStatus`, `transactionNumber`, `customerName`,
`tableLabel`, `amount`, `itemCount`, `createdAt`, `paidAt`. Newest first.

The list is filtered to `status = 'paid'` (D14). A payment that is pending, expired or failed is
never a row: the first is the cart's business and the last two have had their transactions
soft-deleted by `payment_usecase.go:286`.

`createdAt` is also added to the existing `Payment` schema, so the detail screen can show the same
timestamp as the row it was opened from.

### FR-2 — Every order has a table-free URL

Today an order's page is `/t/{code}/status?ref={reference}` — a payment addressed through a table.
That was correct when the only way to reach it was from the table you were sitting at. It is wrong
the moment the guest opens an order from a list, because the order carries its *own* table
(`Payment.tableLabel`), which may not be the table currently scanned.

Orders move to their own routes:

| Route | Renders |
| --- | --- |
| `/orders` | The history list |
| `/orders/{reference}` | One order — the existing `OrderStatusScreen`, unchanged in behaviour |

`/t/{code}/status?ref=…` becomes a `getServerSideProps` redirect to `/orders/{ref}`, the same way
`/t/{code}/checkout` already redirects rather than 404s (`docs/prd-order-app-ux-round-2.md`, D9),
so links already open on a guest's phone keep working.

The order page's header stops resolving the *current* table and shows the order's own
`tableLabel` instead (D4).

### FR-3 — The history screen

`/orders` renders one row per order, newest first. Each row shows, in the order the guest scans it:

1. **The transaction number** — `#12`, the thing the barista will call out, as the row's anchor.
2. **A status pill**, with exactly two values (D14) — `Sedang disiapkan` (orange) /
   `Siap diambil` (green).
3. **Date and time** — `dayjs(createdAt).format('DD/MM/YYYY HH:mm')`, matching
   `TransactionDetail.tsx:194` on the POS side.
4. **Table label and the name on the order** — `Meja 3 · Andi`.
5. **Item count and total** — `3 item · Rp 45.000`.

Empty state: *"Belum ada pesanan"* / *"Pesanan yang Anda buat akan muncul di sini."* with a button
back to the menu. Error state gets the standard `ErrorView` with a retry that re-dispatches
`FETCH`.

Tapping a row goes to `/orders/{reference}`, where the items, options, notes and subtotals already
render. That page keeps its full range of states — an unpaid payment opened by direct URL still
shows its QR — but no row in this list ever leads to one (D14).

### FR-4 — A history entry point in the brand header

`OrderBrandHeader` — already on every order screen via `TableResolveScreen` — gains a receipt icon
button on its right, labelled for screen readers as *"Pesanan Saya"*, pushing `/orders`. It is
present on the menu, the cart and the order page, so the guest is never more than one tap from
their orders.

### FR-5 — A count on that button, replacing the resume banner

On the two screens where a guest browses while an order is in flight — the menu and the cart — the
button carries a badge with the number of orders currently `preparing`. Both pages already fetch
their data in a `Promise.all` inside `getServerSideProps`; the count comes from the same list call
in that same `Promise.all`, so it costs one parallel indexed query and no client-side waterfall.

This is what makes `ResumeOrderBanner` redundant: the badge says the same thing, is not limited to
one order, and does not consume a block of the menu.

### FR-6 — Leaving is free

`useLeaveConfirmation`, its `.native.ts` no-op, `OrderLeaveConfirmAlert` and the four screen props
that thread it (`isLeaveConfirmOpen`, `leaveConfirmTransactionNumber`, `onLeaveConfirm`,
`onLeaveCancel`) are deleted. No `beforeunload` handler, no `routeChangeStart` interception, no
dialog. The guest leaves the order page like any other page, and finds the order under the header
button.

### FR-7 — The session stops remembering "the active order"

`getActiveReference` / `setActiveReference` / `clearActiveReference` come off `SessionRepository`,
`CookieSessionRepository` and `MockSessionRepository`, and `ACTIVE_REFERENCE_STORAGE_KEY` comes out
of `constants.ts`. `ResumeOrderBanner` and its call site in `MenuListHandler` go with them. Nothing
about which orders exist is stored on the device any more; `gl_session_id` and `gl_table_code`
remain, and the server answers the rest.

### FR-8 — History spans tables

No work is required for this and it is the point of stating it: history is keyed by `session_id`,
and `setTableCode` writes a different key. A guest who moves from Meja 3 to Meja 7 and re-scans
keeps one history, each row showing the table that order was placed from.

### FR-9 — The session does not expire while the guest keeps using it

History is only as durable as the session id that keys it, and today that id has a hard stop the
guest cannot see or postpone. `resolveSession` returns a `Set-Cookie` header **only** when it mints
a new id — a valid cookie is reused and never re-issued (`resolveSession.ts:25-27`, asserted by
*"reuses a valid cookie value with no Set-Cookie header"* in `resolveSession.test.ts:13-21`). So
`Max-Age=31536000` counts down from a guest's *first* scan and expires 365 days later no matter how
often they come back. A regular's history dies on an anniversary.

Three changes make the session last as long as a browser permits (D15):

1. `resolveSession` re-issues the cookie on **every** render, not only when minting, so the window
   rolls forward on each visit.
2. `SESSION_ID_COOKIE_MAX_AGE_SECONDS` goes to 400 days — the ceiling RFC 6265bis defines and
   Chrome and Firefox enforce. Asking for more does not get more.
3. The server row is already permanent, and `localStorage` (`gl_session_id`) already survives cookie
   loss through `CookieSessionRepository.reconcile`. Nothing about that changes; FR-9 is about
   keeping the cookie from being the weak link.

---

## Design decisions

**D1 — It is called *order history* in code and *"Pesanan Saya"* in the UI; the API resource stays
`payments`.** The guest's mental object is the order — the food, the number, the table — not the
payment instrument, and `Riwayat Pembayaran` would read as a bank statement. The API keeps
`payments` because the resource genuinely is the payment: it is the row that carries the reference,
the session ownership rule (`payment_usecase.go:309-311`), and the status the screen shows. Files
follow the UI noun (`OrderHistoryUsecase`, `OrderHistoryScreen`, `docs-site/sales/order-history.md`)
and the repository method follows the resource (`PaymentRepository.fetchPayments`).

*Alternative rejected:* a `/orders` API resource fronting transactions. The guest has no read access
to `/transactions` (it is `CheckAuth`-wrapped), `Payment` already carries the fulfilment status by
design (`docs/prd-order-fulfillment-status.md`, D6/D7), and a second read path onto the same rows
would be a second place to get session scoping wrong.

**D2 — The list returns a summary, never full payments.** `GetTransactionById` is a thirteen-
`Preload` query (`apps/api/data/mysql/transaction_repo.go:118`) that pulls variants, materials,
option values, products, categories, coupons and the wallet. Calling it once per payment to paint
a twenty-row list is ~260 queries for a screen that shows a number, a status and a total. The list
usecase instead reads payments by session and hydrates them from one purpose-built
`TransactionRepository.GetTransactionSummariesByIds`, joining `carts`/`tables` for the label and
grouping `transaction_items` for the count.

*Alternative rejected:* reusing `GetTransactionById` in a loop and capping `limit` low. It hides the
cost behind a small number rather than removing it, and the cap becomes load-bearing.

**D3 — `TransactionSummary` is a domain type on the transaction repository, not a MySQL row
struct.** `GetTransactionStatistics` → `[]TransactionStatistic` is the existing precedent for a
repository method returning a purpose-shaped domain value rather than a full entity; this follows
it exactly, so the layering rule ("use cases talk to `domain` interfaces") holds and the method is
mockable through the same `//go:generate mockgen` directive already on
`transaction_repository.go`.

**D4 — The order page shows the order's table, not the scanned table.** `OrderStatusScreen`
currently wraps `TableResolveScreen`, which resolves `/t/{code}`'s table for the header. At
`/orders/{reference}` there is no `{code}`, and using the session's last-scanned table would print
the wrong table on an order placed at a different one. The screen takes the header line from
`payment.tableLabel` instead, and `OrderStatusHandler` loses its `TableResolveUsecase` and
`tableCode` prop. The floor number disappears from that one header — it is on the payload's label's
sibling, not the label, and re-adding it would mean widening the `Payment` contract to reconstruct
a string the guest does not need on a receipt.

**D5 — ~~Expired and failed payments are not history, but pending ones are~~.** *Partly superseded
by D14, which drops pending payments from the list too.* The half that survives is the reasoning
below on expired and failed payments; the half D14 rejects is that a pending payment earns a row
because tapping it returns the guest to a payable QR. When DOKU reports expiry or failure,
`payment_usecase.go:286` soft-deletes the payment's transaction, and the guest's *cart is still
active and still full* — the recovery path is the cart, not a history row. A list of dead
references would be a list of rows that do nothing when tapped.

*Alternative rejected:* showing everything with a `Kedaluwarsa` pill. It makes the list longer,
more alarming and less actionable, and every one of those rows is a dead end.

**D6 — The order page is the detail page; there is no `OrderHistoryDetailScreen`.** Everything the
acceptance criteria asks of a detail view — items, options, notes, subtotals, table, number, status
— is on `OrderStatusScreen` today, for every payment state. Building a second screen would fork the
rendering of an order's contents into two places that must then be kept in agreement.

**D7 — `/t/{code}/status` redirects, it does not stay as a second entry point.** Two URLs for one
payment means two places where a table code can contradict the order, and a link a guest shared or
bookmarked that renders differently from the one the list produces. The redirect is
`getServerSideProps` returning `{ redirect: { destination: '/orders/{ref}', permanent: false } }`,
the shape `docs/prd-order-app-ux-round-2.md` D9 already established for `/t/{code}/checkout`.

**D8 — The badge count is server-rendered per page load and does not live-update.** The number is a
prompt to look, not a status: it changes only at checkout (which navigates) and at completion
(which the guest learns about on the order page itself). Polling it on every screen would put a
recurring request behind a number whose job is to survive one glance. The order page keeps its own
10s poll, untouched (`docs/prd-order-fulfillment-status.md`, D9).

**D9 — The leave guard is deleted, not disabled behind a flag.** Its entire justification was D13
of the fulfilment PRD: *"the dialog promises what FR-9 actually delivers: re-scan the table QR. The
copy changes in the same PR as the history page, whenever that is."* This is that change, and the
honest version of the copy is no dialog. Keeping the hook unused would leave `next/router` event
interception — and a handler that throws out of an event listener — in the codebase with no caller
to justify it.

**D10 — `docs/handlers.md` keeps the browser-lifecycle rule, loses the example.** That file's
*"Browser-lifecycle guards live in `utils/`, not `handlers/hooks/`"* section is a general rule with
`useLeaveConfirmation` as its worked example. The rule stays (it is a real `.eslintrc.json`
boundary); the example becomes `utils/queryParam.ts` / `queryParam.native.ts`, the other
`.native.ts` split, with a line recording that `useLeaveConfirmation` was removed here.

**D11 — No pagination UI in this PRD, but `skip`/`limit` in the contract from day one.** The
endpoint reuses the existing `Limit` and `Skip` parameter components; the screen fetches the first
20 and stops. A café guest with more than twenty live-or-recent orders in one session does not
exist yet, and adding an infinite scroll to a list that is usually one row long is work with no
reader. The contract not needing a change when that reader appears is worth the two parameters.

**D12 — Order-app copy stays Indonesian.** Restating `docs/prd-order-fulfillment-status.md` D15 as
a constraint this feature must honour: every new string in `views/screens/order/**` and
`views/components/orderHistory/**` is Indonesian, and no POS screen is touched by this PRD.

**D13 — No new session lifetime rules.** Open Question 4 of the fulfilment PRD ("how long should
the resume pointer live?") is answered by deletion: nothing device-local expires because nothing
device-local is stored. History lives as long as `gl_session_id` — one year, or until the guest
clears storage — and the server row lives forever.

**D14 — History is paid orders only; an unpaid QR is the cart's problem, not history's.**
*Supersedes the pending-payment half of D5.*

A payment that is pending has not produced anything the guest is waiting on — no food is being
made, no number will be called. What it has produced is a cart that is still there: the only
`cart.Status` write in the codebase is `payment_usecase.go:261`, on the **paid** branch of
`applyQrisStatus`, so a pending payment leaves the cart `active` and full. Nor does re-checkout
duplicate anything — `Checkout` calls `GetPendingPaymentByCartId` and returns the existing payment
when `IsAwaitingPayment(time.Now())` holds (`payment_usecase.go:85-99`), so a guest who lost their
QR gets **the same QR** back by tapping Checkout again. History would be a second route to a place
the cart already reaches in one tap, and the price of that route is a third status pill on every
row and a list that mixes "waiting for my coffee" with "never paid".

*The hole in this, named rather than hidden:* the cart is still mutable while that payment is
pending, and the transaction was snapshotted at checkout. A guest who abandons a QR, adds a third
item, and checks out again gets the original payment back — original amount, original two items —
and on payment the cart converts with the third item unpaid and unmade. That is a pre-existing bug
(nothing in this PRD reaches it) and the reason it is worth fixing on its own is exactly that D14
now leans on "just check out again" being the recovery path. Named in Out of Scope as a follow-up;
Open Question 1 asks how it should behave.

*Alternative rejected:* a pending row with a `Menunggu pembayaran` pill. It is the more "complete"
list and the less useful one — it puts a row in front of the guest whose correct action is
elsewhere.

**D15 — The session cookie rolls forward on every visit and is set to the browser maximum; nothing
is "forever" at the cookie layer.** Review asked for a session that never expires. The server side
already is: `payments.session_id` has no TTL and no cleanup job. The browser side cannot be, and
today it is worse than it looks — `resolveSession` returns `Set-Cookie` only on the mint path
(`resolveSession.ts:25-27`), so a returning guest's cookie is never refreshed and dies 365 days
after their first visit regardless of use.

What "forever" becomes in practice:

- **Re-issue on every render.** `resolveSession` always returns a `setCookie`, and every order page
  already writes it (`ctx.res.setHeader('Set-Cookie', setCookie)`). A guest who visits at least
  once a year never loses the cookie. `resolveSession.test.ts:13-21`, which today asserts the
  *absence* of the header on the reuse path, inverts.
- **400 days, not a year, and not more.** RFC 6265bis caps cookie lifetime at 400 days and Chrome
  and Firefox clamp anything larger, so `SESSION_ID_COOKIE_MAX_AGE_SECONDS` becomes `60 * 60 * 24 *
  400` and a comment records why that number and not a bigger one.
- **`localStorage` stays the backstop**, unchanged: `CookieSessionRepository.reconcile` already
  rewrites the cookie from `gl_session_id` when the two disagree, which is what carries a session
  across a cookie the browser dropped early — Safari caps cookies written via `document.cookie` at
  7 days under ITP, and the server-set header is what keeps this session alive there.

*The one rough edge, accepted:* `getServerSideProps` cannot read `localStorage`. On the single
request after a cookie has genuinely expired, the server mints a new id and renders the page —
including an empty history — against it, and only then does the client reconcile back to the stored
id. Rolling the cookie makes that reachable only after 400 days of total absence, by which point the
device has usually dropped `localStorage` too. Fixing it properly means a client-side refetch after
reconciliation, which is a bigger change than the bug deserves.

*Alternative rejected:* dropping the cookie and keying the session from `localStorage` alone. SSR
would have no session id at all on the first request of every visit, and every order page would
lose its server-rendered data — the thing `docs/prd-order-app-ux-round-2.md` went to some trouble
to get.

---

## Phased plan

Each phase is one PR, leaves `main` green and the product shippable on its own, and names its own
acceptance check.

| # | Phase | Layer | Depends on |
| --- | --- | --- | --- |
| 1 | `GET /payments`, `PaymentSummary`, `createdAt` on `Payment` | API | — |
| 2 | Orders move to `/orders/{reference}`; `/t/{code}/status` redirects | order | — |
| 3 | The session cookie rolls forward and lasts 400 days | libs/ui | — |
| 4 | Frontend payment slice: summary entity, repository, `OrderHistoryUsecase` | libs/ui | 1 |
| 5 | Order history screen, handler and the `/orders` page | order | 2, 4 |
| 6 | History button in the brand header | order | 5 |
| 7 | Preparing count badge on the header button | order | 6 |
| 8 | Delete the leave guard, the resume banner and the active reference | order | 7 |
| 9 | Docs site page and e2e coverage | docs, e2e | 8 |

Phases 1, 2 and 3 are independent of each other and can land in parallel. Phase 3 is the smallest
and blocks nothing, so it is worth landing first: every day it waits, a returning guest's session
is counting down from a date they cannot see.

> Every phase that touches `libs/api-contract/src/api.yaml` regenerates both clients
> (`npx nx run api-contract:generate:go`, `npx nx run api-contract:generate:ts`) and adds the new
> symbol to `libs/ui/src/__mocks__/api-contract.ts`, which Jest substitutes wholesale for the
> generated package.

---

### Phase 1 — `GET /payments`, `PaymentSummary`, `createdAt` on `Payment` (API)

`api.yaml`: a `PaymentSummary` schema, a `PaymentListResponse` (`data` + `meta: MetaPage`), a
`/payments` `get` with the existing `Limit`/`Skip` parameter refs, and `createdAt` (`date-time`,
required) on the existing `Payment` schema. Domain: `TransactionSummary` plus
`GetTransactionSummariesByIds` on `TransactionRepository`, and `GetPaymentsBySessionId` /
`GetPaymentsBySessionIdTotal` on `PaymentRepository` — the latter filtering `status = 'paid'` per
D14, ordered `id DESC`, hitting `idx_payments_session_id`. `PaymentUsecase.GetPaymentList(ctx, sessionId, skip, limit)` joins the
two. Presentation: `ListPayments` handler on `payment_handler.go`, `RequireSessionId`-wrapped in
`payment_route.go`, and `ToApiPaymentSummary` in `payment_transformer.go` next to the existing
`ToApiPayment` (which gains `CreatedAt`). Mocks via `go generate ./...`.

**Acceptance:** `payment_usecase_test.go` covers a session holding a preparing, a ready, a pending
and an expired payment, asserting that only the two paid ones come back and that another session's
payments never leak; `npx nx run api:test` green.

### Phase 2 — Orders move to `/orders/{reference}` (order)

New page `apps/order-web/src/pages/orders/[reference].tsx`, whose `getServerSideProps` resolves the
session and fetches the payment exactly as `t/[code]/status.tsx` does today, minus the table fetch.
`t/[code]/status.tsx` becomes a redirect to `/orders/{ref}` (D7). `OrderStatusScreen` stops wrapping
`TableResolveScreen` and takes its header line from `payment.tableLabel` (D4); `OrderStatusHandler`
drops `tableResolveUsecase` and `tableCode`, using `sessionRepository.getTableCode()` for
"Pesan lagi" and falling back to `/` when the session has never scanned a table. `CartHandler.tsx:71`
and `MenuListHandler.tsx:299` push `/orders/{ref}`. Stories and
`OrderStatusHandler.test.tsx` follow; `checkout.spec.ts` and `orderFulfillment.spec.ts` update their
URL assertions.

**Acceptance:** checkout still lands on a working QR page, now at `/orders/{ref}`; a request to
`/t/{code}/status?ref=X` 307s to `/orders/X`; `npx nx run ui:test` green.

### Phase 3 — The session cookie rolls forward and lasts 400 days (libs/ui)

`resolveSession` returns a `setCookie` on both paths instead of only on the mint path, so every
order page's existing `ctx.res.setHeader('Set-Cookie', setCookie)` refreshes the window.
`SESSION_ID_COOKIE_MAX_AGE_SECONDS` becomes `60 * 60 * 24 * 400`, with a one-line comment naming
the RFC 6265bis cap as the reason it is not larger (D15). `resolveSession.test.ts`'s *"reuses a
valid cookie value with no Set-Cookie header"* case inverts to assert the header **is** returned and
carries the same id; `CookieSessionRepository.test.ts` is unaffected. No API, no screen, no
contract change.

**Acceptance:** a second request carrying a valid `gl_session_id` comes back with a `Set-Cookie`
for the same id and `Max-Age=34560000`; `npx nx run ui:test` green.

### Phase 4 — Frontend payment slice (libs/ui)

`PaymentSummary` on `domain/entities/Payment.ts`, `toPaymentSummary` in
`data/api/payment.transformer.ts`, `fetchPayments` on `domain/repositories/payment.ts`,
`ApiPaymentRepository` (same `sessionRequestConfig`) and `MockPaymentRepository` (with
`setShouldFail`). `OrderHistoryUsecase` in `domain/usecases/orderHistory.ts` — an
`idle / loading / loaded / revalidating / error` machine shaped like `ticketList.ts`, seeded from
SSR params — plus `orderHistory.test.ts` driven by `UsecaseTester` + `flushPromises`. Barrels
updated; no screen renders any of it yet.

**Acceptance:** `npx nx run ui:test` green, with the error branch covered via
`MockPaymentRepository.setShouldFail(true)`.

### Phase 5 — Order history screen and the `/orders` page (order)

`OrderHistoryListItem` in `views/components/orderHistory/`, `OrderHistoryScreen` in
`views/screens/order/` with `loading` / `loaded` / `empty` / `error` variants and the row content of
FR-3, plus `.stories.tsx` for each. `OrderHistoryHandler` (`useUsecase`, `router.push` to
`/orders/{reference}`) with `.test.tsx` using the real use case over
`MockPaymentRepository`. Composition root `app/order/OrderHistory.tsx`, exported from
`app/order/index.ts` and `index.order.ts`. Page `apps/order-web/src/pages/orders/index.tsx`,
SSR-seeding the list. Header is `OrderBrandHeader` with no table line.

**Acceptance:** `/orders` lists a session's orders newest-first with the five fields of FR-3, a row
tap opens that order, and an empty session shows `Belum ada pesanan`.

### Phase 6 — History button in the brand header (order)

`OrderBrandHeader` gains an optional `onHistoryPress`; `TableResolveScreen`, `MenuListScreen`,
`CartScreen`, `OrderStatusScreen` and `OrderHistoryScreen` thread it, and each handler wires
`router.push('/orders')`. Stories gain the variant with the button.

**Acceptance:** every order screen shows the button and one tap from any of them reaches `/orders`;
the accessible name is `Pesanan Saya`.

### Phase 7 — Preparing count badge (order)

`OrderBrandHeader` gains an optional `preparingCount`. `MenuList` and `Cart` composition roots take
it as a prop, and `t/[code]/index.tsx` and `t/[code]/cart/index.tsx` add `fetchPayments()` to their
existing `Promise.all`, counting `fulfillmentStatus === 'preparing'` among `paid` summaries, with a
`.catch(() => [])` so a list failure never blocks the menu (D8).

**Acceptance:** a session with two preparing orders shows `2` on the menu and cart headers; the API
call failing still renders both pages.

### Phase 8 — Delete the leave guard, the banner and the active reference (order)

Remove `utils/useLeaveConfirmation.ts` and `.native.ts`, `views/components/orderStatus/OrderLeaveConfirmAlert.tsx`,
`views/components/menu/ResumeOrderBanner.tsx` and its `MenuListScreen` prop and `MenuListHandler`
call site; remove the four leave props from `OrderStatusScreen`/`OrderStatusHandler`; remove the
active-reference trio from `domain/repositories/session.ts`, `CookieSessionRepository`,
`MockSessionRepository` and `ACTIVE_REFERENCE_STORAGE_KEY` from `constants.ts`, with their tests.
Update `docs/handlers.md` per D10.

**Acceptance:** navigating away from a preparing order raises no dialog and closing the tab raises
no `beforeunload` prompt; `grep -r activeReference libs apps` returns nothing; `npm run lint` and
`npm test` green.

### Phase 9 — Docs site and e2e (docs, e2e)

`docs-site/sales/order-history.md` and its sidebar entry under *Sales & Checkout* in
`docs-site/.vitepress/config.ts`, plus a line in `docs-site/sales/table-ordering.md` and
`order-checkout.md` pointing at it. `apps/order-web-e2e/src/orderHistory.spec.ts`: check out order
A, mark it paid through `dokuStub`, navigate back to the menu **without a dialog**, check out order
B, open `/orders`, assert two rows with the right numbers and statuses, open the first and assert
its items. The e2e suites run post-merge only (`.github/workflows/e2e-main.yml`), so this spec runs
locally before the PR.

**Acceptance:** `npx playwright test --project=order-web-e2e` green locally; the docs page renders
in `npx nx run docs-site:dev`.

---

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| **A guest clears storage or switches browsers and loses their history.** The session cookie is the only identity. | Medium | Unchanged from today's behaviour, and strictly better than the one-slot pointer. The barista still has the order under its number in the POS; the order number is the recovery path, and the ready screen already tells the guest to quote it. Out of scope to fix properly without D-rejected guest accounts (Option C). |
| **Phase 2 changes the URL of the one page a guest may have open.** | Low | The redirect is the mitigation, and it is in the same PR. A tab already open on `/t/{code}/status` keeps polling the same API and is unaffected until its next navigation. |
| **Removing the leave guard lets a guest close the tab and forget the order.** | Medium | This is the intended trade. The header button (Phase 6) and the badge (Phase 7) ship *before* the removal (Phase 8) precisely so the replacement exists first. The physical recovery path — quote the number at the counter — is unchanged. |
| **The summary join drifts from `ToApiPayment`'s field semantics** (e.g. `fulfillmentStatus` derived two ways). | Medium | Derive it once: the summary transformer reads `CompletedAt != nil` from `TransactionSummary` using the same expression as `payment_transformer.go:68-71`, and `payment_transformer_test.go` asserts a summary and a full payment built from the same transaction agree. |
| **Ordering again during a *pending* (unpaid) QRIS reuses the same cart.** The cart only converts on payment (`payment_usecase.go:261`), so a guest who abandons a QR and adds items is editing the cart that payment was quoted against — and re-checkout returns the original payment and amount, losing the added item on confirmation. | Low | Pre-existing and untouched by this PRD: leaving an unpaid QR is already unguarded today (the leave guard only fires on `preparing`). D14 makes the PRD *depend* on re-checkout being the recovery path, so the bug is named there, in Out of Scope and in Open Question 1 rather than absorbed. It needs its own PR. |
| **The one SSR render after a cookie genuinely expires shows an empty history.** `getServerSideProps` cannot read `localStorage`, so it mints a new id, renders against it, and only then does the client reconcile back. | Low | Phase 3 makes it reachable only after 400 days of total absence (D15), by which point `localStorage` has usually gone too. A client-side refetch after reconciliation is the real fix and costs more than the bug. |
| **`/orders` is a top-level route in an app whose every other route is table-scoped.** | Low | Deliberate (D4/D7): orders are session-scoped, and `/` (the table-scan screen) is already table-free. |

---

## Out of Scope

| Not doing | Why |
| --- | --- |
| **Guest accounts / login** | Option C. Cross-device history is not in the acceptance criteria and a login wall contradicts `docs/prd-table-ordering.md`. |
| **Pagination UI** | D11 — contract supports `skip`/`limit`; no screen affordance until a guest exists who needs one. |
| **Pending, expired and failed orders in the list** | D14 for pending (the cart is the recovery path and re-checkout returns the same QR); D5 for the other two (their transactions are soft-deleted, so the row would be a dead end). |
| **Voiding a stale pending payment when the cart changes under it** | The bug D14 leans against: items added after a QR is generated are lost on payment. Real, pre-existing, and its own PR — deciding between voiding the payment and freezing the cart is a product call, not a detail of this feature. Open Question 1. |
| **Re-order ("pesan lagi yang sama") from a history row** | A genuinely good follow-up, and a different feature: it needs cart-from-transaction on the API and a price-changed story. |
| **Live-updating the badge** | D8. |
| **A receipt / printable view of a past order** | The POS prints; nothing in the acceptance criteria asks the guest for one. |
| **Showing elapsed or estimated preparation time anywhere** | `docs/prd-order-fulfillment-status.md` D17, unchanged. |
| **Push, WebSocket or SSE for status** | `docs/prd-order-fulfillment-status.md` D16, unchanged. |
| **pos-mobile parity** | No POS screen changes; `libs/ui/src/app/order/**` is not in the Metro build's surface. |
| **A staff-facing view of one session's orders** | The POS transaction list already filters `source=order` and `fulfillment=preparing`. |

---

## Settled in review

The five questions this PRD opened, and how the first review pass answered them. Recorded rather
than deleted, so the reasoning is not re-litigated from scratch later.

1. **Should a pending (unpaid) order appear in history?** **No.** The cart is never cleared while a
   payment is pending, and re-checkout returns the *same* QR through
   `GetPendingPaymentByCartId`, so the guest who loses a QR already has a one-tap way back that
   does not involve history. D5's pending clause is superseded by **D14**, and the follow-up bug
   that answer exposes is Open Question 1 below.
2. **Should the badge count `ready` orders too?** **No — `preparing` only**, as originally specced
   (FR-5, D8). The badge clears itself once the guest has been told to collect.
3. **How long should a session last?** **Forever, as far as a browser allows** — which is not the
   365 days it claims today, and in practice is less, because the cookie is never re-issued on a
   return visit. **D15** and Phase 3 fix that; the *server* row already has no TTL, so nothing
   caps how far back history goes.
4. **Does the venue want the guest's name on the row?** **Yes.** FR-3 keeps `customerName` on every
   row, next to the table.
5. **Should checking out while an order is preparing warn?** **No warning.** The badge is the
   ambient version of that sentence, and a second order is the point of the feature.

---

## Open Questions

1. **What should happen to a pending payment when the cart changes under it?** Today: nothing —
   `Checkout` returns the original payment and amount while `IsAwaitingPayment` holds, so items
   added after the QR was generated are converted away unpaid and unmade. D14 makes re-checkout the
   sanctioned recovery path for a lost QR, which makes this worth closing. The two candidate
   answers are voiding the stale payment and issuing a fresh QR for the new total, or refusing cart
   mutations while a payment is awaiting. Its own PRD.
2. **Should a guest's oldest history be trimmed for display?** Nothing caps it now, per answer 3
   above, so a regular eventually scrolls past months of coffee. `limit=20` hides this until
   pagination exists (D11); a `createdAt` cutoff is a one-line `WHERE` if it ever reads badly.

---

## Success Criteria

1. A guest can check out, leave the order page with no dialog of any kind, order again, and see
   both orders with correct, distinct statuses in one list.
2. Closing the browser entirely and reopening the app on the same device lands the guest on the
   menu — never on an order page — with their orders one tap away.
3. A guest who scans a different table keeps the same history, and each row names the table its
   order was placed from.
4. Opening a row shows the items, options, notes and total of that order. Every row in the list is
   a paid order (D14); an unpaid payment is reachable only by its own URL.
5. `/orders` paints from one API request, and `payment_usecase_test.go` proves one session can
   never read another's payments.
6. `grep -rn "activeReference\|useLeaveConfirmation" libs apps` returns nothing after Phase 8, and
   the net diff across the nine phases deletes more frontend code than the history screen adds.
7. A guest who last ordered eleven months ago, and again today, still has one session and one
   history — and the request that served them carried a fresh `Set-Cookie` either way (D15).

---

## Sources

- Starbucks mobile order & pay — recent orders and in-app pickup status:
  https://www.starbucks.com/rewards/mobile-order-pay/
- GrabFood / GoFood order tracking — concurrent orders under a badged "Pesanan" tab:
  https://www.grab.com/id/food/
- pesan.app — the Indonesian QR-ordering flow this app follows:
  https://pesan.app
- MDN, `beforeunload` — why the guard's text cannot be customised and when browsers suppress it:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
- RFC 6265bis, §4.1.2.1 — the 400-day cap on cookie lifetime that D15's number comes from:
  https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-4.1.2.1
- Chrome developer notes, *Cookie expiration limited to 400 days*:
  https://developer.chrome.com/blog/cookie-max-age-expires
- WebKit, *Intelligent Tracking Prevention 2.1* — the 7-day cap on cookies written via
  `document.cookie`, and why the server-set header is the one that keeps this session alive:
  https://webkit.org/blog/8613/intelligent-tracking-prevention-2-1/
- Nielsen Norman Group, *Confirmation dialogs*: interrupting a navigation the user chose is a cost
  paid on every exit to prevent a rare mistake:
  https://www.nngroup.com/articles/confirmation-dialog/
