# Order Checkout (QRIS)

## What it does

[Table ordering](/sales/table-ordering) got a customer from a scanned QR code to a full cart. This closes the loop: the cart's **Checkout** button now leads to a real payment. The guest sees a read-only recap of what they're about to be charged, taps **"Bayar dengan QRIS"**, is asked their name (prefilled if they've ordered from this phone before), and is shown a **QRIS QR code** generated on the spot. Because the guest is paying on the same phone the QR is displayed on, they can't point its camera at its own screen — so the screen also offers **"Simpan QR"**, saving the code as an image they open from their banking or e-wallet app's "pay from gallery" flow.

Once the bank confirms payment, the screen shows a success message and, a couple of seconds later, moves to an order-status screen: the table label (large — it's how the order finds them, there's no pager and no order number), the guest's name, and what they paid for. A `Transaction` now exists for that order, marked paid, showing up on the POS exactly like a cashier-entered sale — badged **"Order App"** and filterable by source — with the right table attached so staff know where to carry it.

## Why it matters

Table ordering solved discovery and cart-building, but a guest still had to walk to the counter and pay a cashier — the actual bottleneck at peak hours was untouched. This is what makes self-ordering actually replace a trip to the till, not just make composing the order nicer.

It also had to be built without ever letting a payment credential near the customer's phone. Every DOKU call — minting the QR, checking its status, receiving DOKU's payment notification — happens inside the Go API. The order app talks only to Gatherloop's own endpoints and never holds, or could leak, a gateway secret.

## Key capabilities

- **QRIS, generated per order** — a fresh, amount-locked dynamic QR from DOKU for exactly what the cart totals at the moment of checkout; a later price edit by staff can never change what the guest is being asked to pay.
- **Save-and-pay-from-gallery** — the guest is paying on the same device showing the QR, so "Simpan QR" downloads it as a PNG for their banking app's QRIS-from-gallery flow, with a long-press fallback on older iOS Safari.
- **One QR per cart** — a double-tapped pay button or a reloaded screen returns the existing pending QR rather than minting a second one.
- **Cart freeze while a QR is live** — while a payment is pending and unexpired, the cart it was priced from can't be mutated; the freeze releases itself the moment the QR expires.
- **Two independent ways to learn a payment succeeded** — DOKU's own webhook notification is the primary path, and the screen's own status poll independently re-checks with DOKU, so a missed or delayed webhook never leaves a guest staring at a paid QR that the app doesn't know is paid.
- **The server decides expiry, not the phone's clock** — a countdown reaching zero triggers one last check with DOKU before anything is shown as expired, so a few seconds of clock skew can never tell a guest who just paid that their window closed.
- **Remembers the guest's name** — asked once per session, offered again on the next order from the same phone, without ever becoming a login or an account.
- **Origin visible on every transaction** — the POS transaction list and detail screen show a **Source** badge (`POS` / `Order App`) and the table it's headed to, with a matching filter.
- **A wrong payment is fixed the way a wrong cashier payment always was** — no refunds, voids or partial payments exist anywhere in the POS yet, so an order-app mistake is unwound the same manual way (`Unpay` within 24 hours) as one at the till.

## For engineers

- Customer-facing screens: `libs/ui/src/presentation/views/screens/order/{CheckoutScreen,OrderStatusScreen}.tsx`, components under `libs/ui/src/presentation/views/components/checkout/`
- Frontend payment state machine: `libs/ui/src/domain/usecases/checkout.ts` — the name prompt, QR polling and countdown-triggered final check all live here, not in the screen
- Route entry: `/t/{code}/checkout` (unchanged route, now a real flow instead of a stub) and `/t/{code}/status?ref={reference}`, both `apps/order-web/src/pages/t/[code]/*.tsx`
- Gateway integration, entirely server-side: `apps/api/data/doku/**` implements `PaymentGatewayRepository` (`apps/api/domain/payment_repository.go`) against DOKU's SNAP QRIS Direct API — the only layer that ever holds a DOKU credential
- Checkout + confirmation usecases: `apps/api/domain/payment_usecase.go` (`Checkout`, `ConfirmPayment`, `GetPaymentStatus`)
- Backend routes: `POST /carts/current/checkout`, `GET /payments/{partnerReferenceNo}`, and the unauthenticated-but-signature-verified `POST /payments/doku/notification` (`apps/api/presentation/restapi/payment_route.go`, `VerifyDokuSignature` middleware)
- Transaction origin: `source` (`pos` \| `order`) and `cart_id` on `transactions` (migration `000023`), surfaced in `libs/ui/src/presentation/views/components/transactions/{TransactionListItem,TransactionDetail}.tsx`
- Guest identity: `customers` table keyed by session id (migration `000024`) — a display name only, no phone, email or cross-session identity
- Design doc: `docs/prd-order-checkout-qris-doku.md` — every decision behind the above, including why the transaction is created unpaid at QR generation rather than on payment success (D4), how an abandoned checkout is disposed of (D5), and what's still explicitly out of scope (refunds, other payment methods, kitchen notifications)
