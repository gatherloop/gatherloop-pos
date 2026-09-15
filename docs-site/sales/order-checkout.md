# Order Checkout (QRIS)

## What it does

[Table ordering](/sales/table-ordering) got a customer from a scanned QR code to a full cart. This closes the loop: the cart page — already showing the guest their items and total — is also the payment page. Its footer button reads **"Bayar dengan QRIS · {total}"**; there's no separate checkout page recapping the same cart first. Tapping it asks the guest's name (prefilled if they've ordered from this phone before) and takes them straight to `/t/{code}/status?ref={reference}`, a **QRIS QR code** generated on the spot at a URL keyed to that payment — reloading the page, backing out and returning, or reopening a bookmark all show the same live QR until it's paid or expires, instead of losing it. Because the guest is paying on the same phone the QR is displayed on, they can't point its camera at its own screen — so the screen also offers **"Simpan QR"**, saving the code as an image they open from their banking or e-wallet app's "pay from gallery" flow.

Once the bank confirms payment, that same page flips in place to the order-status view — no second navigation, because it was the order-status page all along: the table label (large — it's how the order finds them, there's no pager and no order number), the guest's name, and what they paid for. A `Transaction` now exists for that order, marked paid, showing up on the POS exactly like a cashier-entered sale — badged **"Order App"** and filterable by source — with the right table attached so staff know where to carry it.

That order-status page doesn't stop at "paid" — it keeps watching the order through to pickup. See [Order Fulfilment Status, After Payment](#order-fulfilment-status-after-payment) below.

## Why it matters

Table ordering solved discovery and cart-building, but a guest still had to walk to the counter and pay a cashier — the actual bottleneck at peak hours was untouched. This is what makes self-ordering actually replace a trip to the till, not just make composing the order nicer.

It also had to be built without ever letting a payment credential near the customer's phone. Every DOKU call — minting the QR, checking its status, receiving DOKU's payment notification — happens inside the Go API. The order app talks only to Gatherloop's own endpoints and never holds, or could leak, a gateway secret.

## Order Fulfilment Status, After Payment

Paying doesn't end the guest's page — it starts the part that closes the loop. The same URL that showed the QR now shows a **preparing** screen: the guest's pickup number as the largest thing on it, a pulsing ring and an animated ellipsis proving the page is live, the table, and the item list — with no elapsed timer or countdown anywhere, deliberately. A barista finishing the order marks it **Ready** from the POS (see [Transactions](/sales/transactions)), and the guest's open page flips itself to a green **ready** screen within about ten seconds, telling them to collect at the counter with their number. There's no push notification — the page gets there by polling — so a guest who closes the tab is warned first, and can always get back by re-scanning the table QR, which resumes the same order.

## Key capabilities

- **QRIS, generated per order** — a fresh, amount-locked dynamic QR from DOKU for exactly what the cart totals at the moment of checkout; a later price edit by staff can never change what the guest is being asked to pay.
- **Save-and-pay-from-gallery** — the guest is paying on the same device showing the QR, so "Simpan QR" downloads it as a PNG for their banking app's QRIS-from-gallery flow, with a long-press fallback on older iOS Safari.
- **One QR per cart** — a double-tapped pay button or a reloaded screen returns the existing pending QR rather than minting a second one.
- **The QR lives at a URL, not in memory** — `/t/{code}/status?ref={reference}` is a durable, reloadable page for that one payment; reloading, backing out and returning, or reopening a bookmark all show the same pending QR (or the paid outcome, once it's paid) instead of stranding the guest back at an empty cart.
- **Cart freeze while a QR is live** — while a payment is pending and unexpired, the cart it was priced from can't be mutated; the freeze releases itself the moment the QR expires.
- **Two independent ways to learn a payment succeeded** — DOKU's own webhook notification is the primary path, and the screen's own status poll independently re-checks with DOKU, so a missed or delayed webhook never leaves a guest staring at a paid QR that the app doesn't know is paid.
- **The server decides expiry, not the phone's clock** — a countdown reaching zero triggers one last check with DOKU before anything is shown as expired, so a few seconds of clock skew can never tell a guest who just paid that their window closed.
- **Remembers the guest's name** — asked once per session, offered again on the next order from the same phone, without ever becoming a login or an account.
- **Origin visible on every transaction** — the POS transaction list and detail screen show a **Source** badge (`POS` / `Order App`) and the table it's headed to, with a matching filter.
- **A wrong payment is fixed the way a wrong cashier payment always was** — no refunds, voids or partial payments exist anywhere in the POS yet, so an order-app mistake is unwound the same manual way (`Unpay` within 24 hours) as one at the till.
- **The status page keeps polling after "paid"** — once the barista marks the order ready on the POS (see [Transactions](/sales/transactions)), the guest's already-open page flips to a pickup screen within about ten seconds, no reload needed.
- **No elapsed time is ever shown to the guest** — the preparing screen proves it's live with motion (a pulsing ring, an animated ellipsis), never a duration or a countdown, so a longer-than-usual wait never reads as the app being stuck.
- **Leaving mid-order is a deliberate choice, and reversible** — closing the tab or navigating away while the order is still preparing raises a confirmation, and re-scanning the table QR always returns to the same order's status page.

## For engineers

- Customer-facing screens: `libs/ui/src/presentation/views/screens/order/{CartScreen,OrderStatusScreen}.tsx` — the cart screen owns the pre-payment recap and the "Bayar dengan QRIS" CTA (there is no separate checkout screen), components under `libs/ui/src/presentation/views/components/checkout/`
- Frontend payment state machines, split across the hop: `libs/ui/src/domain/usecases/checkout.ts` owns just the name prompt and payment creation, terminating at `created` with the payment in context; `libs/ui/src/domain/usecases/orderStatus.ts` owns everything about watching one, seeded from its SSR-fetched `payment` — QR polling, the countdown-triggered final check, and the expiry branch. The handoff between them is the navigation to `/t/{code}/status?ref={reference}`, not shared in-memory state.
- Route entry: `/t/{code}/cart` (recap and pay, `apps/order-web/src/pages/t/[code]/cart/index.tsx`) and `/t/{code}/status?ref={reference}` (`apps/order-web/src/pages/t/[code]/status.tsx`) — `/t/{code}/checkout` is a permanent redirect to the cart (`apps/order-web/next.config.js`), not a page
- `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` gates the cart's pay button (`libs/ui/src/app/order/Cart.tsx`); when unset the button renders disabled with "Checkout belum tersedia" instead of routing anywhere
- Gateway integration, entirely server-side: `apps/api/data/doku/**` implements `PaymentGatewayRepository` (`apps/api/domain/payment_repository.go`) against DOKU's SNAP QRIS Direct API — the only layer that ever holds a DOKU credential
- Checkout + confirmation usecases: `apps/api/domain/payment_usecase.go` (`Checkout`, `ConfirmPayment`, `GetPaymentStatus`)
- Backend routes: `POST /carts/current/checkout`, `GET /payments/{partnerReferenceNo}`, and the unauthenticated-but-signature-verified `POST /payments/doku/notification` (`apps/api/presentation/restapi/payment_route.go`, `VerifyDokuSignature` middleware)
- Fulfilment status is `transactions.completed_at`, a nullable timestamp read through the `Payment.fulfillmentStatus` field `ToApiPayment` derives (`apps/api/presentation/restapi/payment_transformer.go`) — the guest never reads `transactions` directly
- `OrderStatusUsecase` (`libs/ui/src/domain/usecases/orderStatus.ts`) splits `loaded` into `preparing` (polls every 10s) and `ready` (terminal, stops polling); the two screens are `OrderPreparingView` / `OrderReadyView` (`libs/ui/src/presentation/views/components/orderStatus/`)
- The leave-confirmation guard is `useLeaveConfirmation` (`libs/ui/src/utils/`) — the one place in `libs/ui` allowed to import `next/router`, since browser-lifecycle APIs have no Metro equivalent
- Design doc: `docs/prd-order-fulfillment-status.md` — the barista/guest state model (`completed_at` on `transactions`, D1/D2), why no duration is ever rendered (D17), and what a future kitchen display system inherits from this design
- Transaction origin: `source` (`pos` \| `order`) and `cart_id` on `transactions` (migration `000023`), surfaced in `libs/ui/src/presentation/views/components/transactions/{TransactionListItem,TransactionDetail}.tsx`
- Guest identity: `customers` table keyed by session id (migration `000024`) — a display name only, no phone, email or cross-session identity
- Design doc: `docs/prd-order-checkout-qris-doku.md` — every decision behind the above, including why the transaction is created unpaid at QR generation rather than on payment success (D4), how an abandoned checkout is disposed of (D5), and what's still explicitly out of scope (refunds, other payment methods, kitchen notifications)
- Follow-up design doc: `docs/prd-order-app-ux-round-2.md` — moved checkout from its own page onto the cart page and gave the QR a durable, reloadable URL on the status page (D4, D5), retiring the old `/checkout` route
