# Order History

## What it does

Every past order a guest paid for from this session is one tap away, under a receipt-icon button
labelled **"Pesanan Saya"** in the brand header — present on the menu, the cart and the order
page itself. Tapping it opens `/orders`: a list of the guest's paid orders, newest first, each row
showing the transaction number the barista will call out, a status pill (**Sedang disiapkan** /
**Siap diambil**), the date and time, the table and the guest's name, and the item count and
total. Tapping a row opens that order's own page — the same [order-status
screen](/sales/order-checkout#order-fulfilment-status-after-payment) the guest landed on right
after paying, with its items, options, notes and subtotal, still polling for `ready` if it hasn't
gotten there yet.

While an order is being made, the guest doesn't have to keep that page open to keep the order
"alive": leaving it — closing the tab, going back to the menu, ordering again — raises no dialog.
Instead, the header button on the menu and cart screens carries a small badge counting how many of
the guest's orders are currently `preparing`, so a second order or three is exactly as supported as
a first one.

Every order also gets its own durable, guessable-free URL — `/orders/{reference}` — independent of
which table it was placed from, so a guest who scans a different table on their next visit still
sees every order they've ever placed in one list, each row naming the table it came from. The old
`/t/{code}/status?ref=…` URL still works: it's a redirect, so a link already printed or bookmarked
keeps landing somewhere useful.

## Why it matters

Before this, an order's status page was reachable from exactly one place — the URL the guest
landed on right after paying — and nothing else in the product remembered it. Two workarounds
stood in for a real history: a confirmation dialog stopping the guest from leaving that page while
an order was `preparing`, and a single device-local pointer to "the" active order. Neither scaled
past one order at a time, and the dialog actively punished a guest who wanted to order a second
round while the first was still being made — exactly the moment a café wants to say yes, not
"are you sure?".

The fix follows the pattern most order-ahead apps already use — Starbucks' "Recent orders",
GoFood/GrabFood's badged "Pesanan" tab — the live order is a row in a list, not a page the guest is
held on. It also just reflects what the server already knew: every payment has always been
recorded against the guest's session (`payments.session_id`), so the "list of orders" this page
renders isn't new data, only a new way of looking at data that already existed.

## Key capabilities

- **Every paid order, newest first** — one API call (`GET /payments`) paints the whole list; a
  pending or expired payment is never a row, because the cart is where those belong (see below).
- **A durable per-order URL** — `/orders/{reference}` renders the same order page regardless of
  which table's QR the guest scanned to get there, and survives a bookmark or a reload.
- **A history spanning every table a guest has ordered from** — history is keyed to the guest's
  session, not the table currently scanned, so moving from one table to another never starts a new
  history.
- **A badge, not a guard** — the header button on the menu and cart carries the count of orders
  currently `preparing`, computed server-rendered alongside the page's own data; leaving an
  in-progress order raises no confirmation of any kind.
- **The guest's session lasts as long as a browser allows** — the session cookie renews itself on
  every visit and is set to 400 days, the maximum RFC 6265bis and current browsers permit, instead
  of counting down from the guest's first-ever visit.
- **A pending or unpaid QR is never a history row** — it hasn't produced anything to wait on yet,
  and the guest's cart (which is locked for exactly as long as that QR is payable) is always the
  faster way back to it than a history entry would be.

## For engineers

- Customer-facing screen: `libs/ui/src/presentation/views/screens/order/OrderHistoryScreen.tsx`
  (`loading` / `loaded` / `empty` / `error` variants), rows in
  `libs/ui/src/presentation/views/components/orderHistory/OrderHistoryListItem.tsx`
- Handler and use case: `libs/ui/src/presentation/handlers/order/OrderHistoryHandler.tsx`,
  `libs/ui/src/domain/usecases/orderHistory.ts` (an `idle / loading / loaded / revalidating /
  error` state machine, seeded from the SSR-fetched list)
- Composition root and route: `libs/ui/src/app/order/OrderHistory.tsx`,
  `apps/order-web/src/pages/orders/index.tsx` (the list) and
  `apps/order-web/src/pages/orders/[reference].tsx` (one order — the same `OrderStatusScreen` used
  right after checkout); `apps/order-web/src/pages/t/[code]/status.tsx` is now a
  `getServerSideProps` redirect to `/orders/{reference}`
- Backend: `GET /payments` (`apps/api/presentation/restapi/payment_handler.go`,
  `RequireSessionId`-wrapped like the existing payment routes), backed by
  `PaymentUsecase.GetPaymentList` joining `PaymentRepository.GetPaymentsBySessionId` (filtered to
  `status = 'paid'`) with `TransactionRepository.GetTransactionSummariesByIds` — a purpose-built
  query rather than the thirteen-`Preload` `GetTransactionById` run in a loop
- History button and badge: `OrderBrandHeader`'s `onHistoryPress` / `preparingCount` props
  (`libs/ui/src/presentation/views/components/base/OrderBrandHeader.tsx`); the badge is computed
  from the same `fetchPayments()` call the menu and cart pages already make inside their
  `getServerSideProps` `Promise.all`, with a `.catch(() => [])` so a failed call never blocks the
  page
- Session lifetime: `resolveSession` (`libs/ui/src/data/session/resolveSession.ts`) now re-issues
  `Set-Cookie` on every request, not only when minting a new id;
  `SESSION_ID_COOKIE_MAX_AGE_SECONDS` (`libs/ui/src/data/session/constants.ts`) is `60 * 60 * 24 *
  400`
- Deleted along with the device-local pointer: `useLeaveConfirmation` and its `.native.ts` no-op,
  `OrderLeaveConfirmAlert`, `ResumeOrderBanner`, and the `getActiveReference` /
  `setActiveReference` / `clearActiveReference` trio on `SessionRepository`
- Design doc: `docs/prd-order-history.md` — the full reasoning, including why a pending payment is
  excluded from the list (D14), why the order page (not a new detail screen) is reused for a
  history row's target (D6), and why the session cookie's renewal is capped at 400 days rather
  than made to last forever (D15)
- Depends on [Order Checkout (QRIS)](/sales/order-checkout) for the payment and order-status model,
  and [Table Ordering](/sales/table-ordering) for the session and cart this feature reads from
