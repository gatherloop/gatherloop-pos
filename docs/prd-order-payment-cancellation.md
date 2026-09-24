# PRD: Order App — Guest Cancels a Pending Payment

**Status:** Draft v2 for review — revised after review on [gatherloop/gatherloop-pos#598](https://github.com/gatherloop/gatherloop-pos/pull/598) (see the Revision note and [Settled in review](#settled-in-review)); open questions listed near the end
**Scope:** letting a guest on the order app's payment-countdown page (`/orders/{reference}`, QRIS and cash) cancel their pending payment, with a confirmation, including when they press the browser/Android back button — so the cart unlocks with its items intact and they can check out again, with a different method if they want.
**Extends, does not supersede:** `docs/prd-order-checkout-qris-doku.md` (cited as *QRIS D<n>*), `docs/prd-order-cash-payment.md` (*Cash D<n>*), `docs/prd-order-history.md` (*History D<n>*), `docs/prd-order-whatsapp-notifications.md` (*WA D<n>*).
**Supersedes:** Cash D21 ("A guest cannot cancel their own cash order in v1") — that decision deferred cancel until someone wrote the rule for the race against a cashier who is mid-collection. D8 below is that rule. Also History D14 and Cash D17, in part: a pending **QRIS** payment becomes an order-history row too (D19).

> **Revision note (v2).** v1 made cancel reachable only from the countdown page and its Back button. Review raised the case v1 left open: the guest **closes the tab**, comes back through the table QR, and finds a cart they can't change. Nothing tells them why. Adding an item from the menu fails **silently**. A pending QRIS payment isn't in order history. v2 keeps the cart lock but makes it **visible and actionable wherever the guest can hit it**: the cart response carries the pending payment (D18); the menu bar, the item sheet, the cart page and cart-item edit each say a payment is waiting and offer "continue" or "cancel" (D21); the item sheet's "cancel and add" finishes the guest's intent in one step (D22); failed cart writes refetch instead of silently reverting (D23); and order history lists pending QRIS (D19). The reviewer's alternative, *clear the cart at checkout and drop the lock*, is recorded as Alternatives §4 Option B with why it was not taken. The cancel dialog moves out of `OrderStatusUsecase` into a shared `PaymentCancelUsecase`, because three screens now need it. D12 is superseded by D20, and D13's mechanism changes accordingly. Phases 11–14 are new, and phases 6 and 10 are rescoped. Details in [Settled in review](#settled-in-review).

---

## Problem Statement

After checkout the guest lands on `/orders/{reference}` (`CartHandler.tsx:86` pushes it). While the payment is `pending` the page shows either `QrisPaymentView` or `CashPaymentView`, each a countdown to `payment.expiredAt`, and nothing else a guest can act on (`OrderStatusScreen.tsx:79-104`). The only exits are paying or waiting out the timer: 5 minutes for QRIS (`DOKU_QRIS_EXPIRY_SECONDS`), 10 minutes for cash (`CASH_PAYMENT_EXPIRY_SECONDS`).

A guest who changes their mind is stuck. The usual reason is the payment method: they picked QRIS and their bank app won't open the saved QR, or they picked cash and would rather not walk downstairs. Pressing Back looks like it works but doesn't:

1. Back lands on `/t/{code}/cart`. The items are there because the server cart is still `active`, but every edit fails with `400 "cart is locked by a pending payment"` (`CartUsecase.ensureCartUnlocked`, `apps/api/domain/cart_usecase.go:221`).
2. Tapping Checkout again, even with the other method picked in `CustomerDetailsSheet`, returns **the same pending payment**. `PaymentUsecase.Checkout` is idempotent per QRIS D11 (`payment_usecase.go:124-148`): while a pending, unexpired payment exists on the cart it returns that payment and ignores the new `method`. The guest gets sent back to the countdown they tried to leave.
3. So the guest ends up waiting for the timer, walking to the counter, or leaving.

It gets worse when the guest **leaves the countdown page altogether**: they close the tab, the phone kills the browser, or they scan the table QR again later. Refreshing is harmless, because `/orders/{reference}` re-reads the payment when it renders. Coming back through the table QR is not:

4. **The menu fails silently.** "Tambah ke keranjang" closes the item sheet immediately and dispatches `ADD_ITEM`. The API rejects it with the lock `400`. `CartUsecase` (`libs/ui/src/domain/usecases/cart.ts`, the `MUTATE_ERROR` branch) reverts to the previous cart and stores `"Failed to update cart"` in `errorMessage`. `MenuListHandler` never renders that field. The item simply isn't there, and nothing says why.
5. **The cart page gives no reason either.** Items are listed, edits fail, and Checkout returns the old payment whatever method was picked (point 2).
6. **Order history doesn't list it** if it's QRIS. `GET /payments` returns paid payments and pending *cash* only (`payment_repo.go:54`, History D14, Cash D17).

The lock is correct, and it releases on its own within 5 or 10 minutes (the sweeper, Cash D6). But it is **invisible**. The guest can't see that a payment is waiting, can't get back to it except by accident, and can't release it early.

### Root cause

The payment lifecycle has no transition the guest can trigger. A payment leaves `pending` only through:

- a gateway result: `applyQrisStatus` (`payment_usecase.go:293`), reached from the DOKU webhook, the guest's own polling, or the sweeper;
- the clock: `expirePayment` via `ExpireStalePayments` (`payment_usecase.go:417`) or `refreshPendingCashPaymentStatus`;
- a cashier: `TransactionUsecase.PayTransaction` → `settleOrderPayment` (`transaction_usecase.go:211-281`).

The machinery for "give up on this payment" already exists as `finalizeUncollectedPayment` (`payment_usecase.go:377`). It moves the payment to a terminal state, releases the availability reservation, and soft-deletes the transaction, which is what unfreezes the cart. This feature is therefore mostly **one new entry point into existing machinery**, plus three pieces nothing in the system has had to answer until now:

- **Late money.** A QRIS QR is still payable at DOKU after we cancel it locally, since the guest has a saved PNG (QRIS D23). Today's late-payment path (QRIS D5, `paid_late`) un-deletes and pays. It does **not** notice that the cart may already carry a *second*, newer live payment. With expiry that race is rare. A cancel button makes "cancel QRIS, re-checkout with cash" the normal path, so the gap has to be closed (D7). It also exists today for `expired`.
- **The cashier race.** Cash D23 lets a cashier pay a soft-deleted *expired* order transaction, which is correct when a guest is standing at the till with money. It is wrong when the guest *deliberately cancelled* and may have re-ordered (D8).
- **The back button.** Nothing in `libs/ui` intercepts history navigation today (no `beforePopState`, `popstate` or `beforeunload` anywhere in `libs/ui/src` or `apps/order-web/src`).
- **Nothing outside the countdown page knows a payment is pending.** The lock is enforced only server-side, in `ensureCartUnlocked`. `GET /carts/current` doesn't mention it, so no screen that reads the cart can explain it.

### Goals

1. The countdown page offers **"Batalkan pembayaran"** for both QRIS and cash. It opens a confirmation, and nothing is cancelled until the guest confirms.
2. A confirmed cancel releases the cart. The guest is returned to `/t/{code}/cart` with **every item, amount and note intact** and the cart **editable**.
3. The guest can check out again straight away, with either method. That creates a fresh payment and transaction.
4. Pressing Back (browser, Android hardware back, iOS swipe-back) while a payment is pending opens **the same confirmation**, instead of silently leaving the guest on a locked cart.
5. No money is lost or double-counted. A guest who has already paid, or pays at the last second, ends up with a paid order, never a cancelled one.
6. **A locked cart is never a dead end.** On the menu, the item sheet, the cart page, cart-item edit, and order history, the guest can see that a payment is waiting and can continue it or cancel it. No cart write fails without the screen explaining why.
7. Each phase ships as one small PR, and the phases are arranged for parallel work.

### Non-Goals

| Not doing | Why |
|---|---|
| Refunds | Cancel applies to **unpaid** payments only. Once DOKU or a cashier has the money, cancel returns the paid payment and the guest sees "preparing" (D3). Refunds stay a staff action outside the app (QRIS non-goals). |
| Cancelling a **paid** order / an order in preparation | A different feature with kitchen and wallet consequences. `UnpayTransaction` stays staff-only. |
| Intercepting tab close, reload, or Back when the status page is the first entry in the tab's history (opened from WhatsApp, a bookmark, or order history in a new tab) | Browsers do not allow a custom dialog there. `beforeunload` can only show the browser's generic prompt, and it also fires on reload. The payment stays pending. v2 makes that recoverable instead of intercepting it: the next menu or cart visit shows it and offers to continue or cancel (D21), order history lists it (D19), and the sweeper still expires it (Cash D6). |
| Letting staff cancel a guest's pending payment from the POS | The POS can already delete an unpaid transaction. Settling that payment row is a separate gap, recorded under Out of Scope. |
| Preselecting "the other" method when the guest re-opens the checkout sheet | Open question 2. v1 reopens the sheet exactly as it opens today. |
| A toast on the cart after cancelling | The order app has no toast surface: no order handler uses a toast controller. Returning to an editable cart with its items is the confirmation. Open question 3. |
| Several unpaid orders at once for one guest | A cart becomes exactly one order, and the lock is what enforces that (Alternatives §4). A guest who wants a second order while one is unpaid finishes or cancels the first. |

---

## How comparable products handle this

Hosted checkouts (payment-gateway pages, marketplace apps) nearly always pair a pending QR or virtual-account payment with a **"Cancel payment" / "Change payment method"** link. It sits under the countdown, is visually secondary to the payment instruction, and is guarded by a confirmation that warns *"if you have already paid, do not cancel"*. When the guest confirms, the order goes back to a re-payable state, not to an empty basket. Back-navigation interception on web checkouts follows the same pattern: the back press is caught and turned into the same confirmation.

> **Verification note.** No vendor documentation was fetched for this section. It describes the pattern from general familiarity, and every decision below is also justified from this repo's own code, so nothing depends on the paragraph being an exact description of any product. No Sources section is offered.

---

## Alternatives Considered

### 1. What a cancelled payment *is*

**Option A: a new terminal state, `payments.status = 'cancelled'`, reached through the existing `finalizeUncollectedPayment`. (Recommended)**
- ✅ Reuses the only code path that already releases availability, soft-deletes the transaction and thereby unfreezes the cart. There is one definition of "giving up on a payment", as the comment on `finalizeUncollectedPayment` intends.
- ✅ `status` is `VARCHAR(16)`, so the value itself needs no DDL.
- ✅ It can be told apart from `expired` everywhere it matters: the guest's copy ("dibatalkan", not "waktu habis"), the cashier guard (D8), and metrics.
- ❌ It adds a value to a response enum that two clients switch on exhaustively (`stateTypeForPayment` in `libs/ui/src/domain/usecases/orderStatus.ts`). It has to reach the frontend before the API emits it (Rollout, D11).

**Option B: reuse `expired`.**
- ✅ Zero contract change.
- ❌ It lies in three places. The guest sees "Waktu pembayaran habis" for something they did. Metrics can't separate "abandoned" from "switched method". And Cash D23's late-cashier un-delete path, which is right for `expired`, would resurrect an order the guest deliberately cancelled (D8).

**Option C: hard-delete the payment and transaction.**
- ✅ Nothing to explain in the data.
- ❌ It destroys the record a late DOKU notification needs to find (QRIS D14 keys on `partner_reference_no`). A late payment would become `unknown_reference`, which means money received with no order. Not acceptable.

### 2. What cancel does about DOKU (QRIS only)

**Option A: cancel locally only.**
- ✅ Simplest.
- ❌ A guest who paid ten seconds ago, with the webhook not yet arrived, gets a cancelled order and a paid QR.

**Option B: confirm with DOKU first (`QueryQris`), then cancel locally. If DOKU says paid, pay instead. (Recommended for v1)**
- ✅ It closes the realistic race, "I paid, the screen hasn't caught up, I hit cancel", with a call the client already exists for, using the same "the server, never the client, decides" stance as QRIS D12a.
- ✅ Every piece is already built and tested (`QueryQris`, `applyQrisStatus`).
- ❌ The QR is still payable at DOKU until its own expiry (≤ 5 min). A guest who pays the saved PNG *after* cancelling produces a late payment. D7 handles that correctly, but it exists.

**Option C: B plus cancelling the QR at DOKU (SNAP `qr-mpm-cancel`).**
- ✅ Closes the residual window: DOKU refuses the payment.
- ❌ QRIS PRD's verification note applies. The endpoint is part of the Bank Indonesia SNAP QRIS MPM family, but whether DOKU's `snap-adapter` exposes it **for our merchant account** is unverified. Building the feature on it would block the whole feature on a dashboard check.
- **Verdict:** ship B. Add C as an independent, optional phase (phase 9, D5) that the product never depends on.

### 3. How the back button is intercepted

**Option A: Next's `Router.beforePopState`, wrapped in a web-only helper in `libs/ui/src/utils/`. (Recommended)**
- ✅ It is the framework's supported hook for pages-router pop handling. `utils/` is the one place `libs/ui` may import `next` (`docs/trd-order-app-composition-and-ssr.md`), and `utils/queryParam.ts` already imports `next/router` there.
- ✅ Returning `false` stops Next from navigating, so the status page stays mounted and the confirmation can open over it.
- ❌ The browser has already popped the entry when the hook runs, so the helper must restore it (re-push the current URL). Getting that right across Chrome, Android Chrome and iOS Safari needs e2e proof and a manual device check (phase 7).

**Option B: a raw `popstate` listener with a sentinel history entry.**
- ❌ It competes with Next's own `popstate` handler, which runs regardless and navigates to the cart. The page unmounts before the dialog can render.

**Option C: `beforeunload`.**
- ❌ It shows only the browser's generic "Leave site?" text, never our confirmation. It does not fire on in-app history pops, and it does fire on reload.

**Option D: do nothing and rely on the cart page.**
- ❌ This fails acceptance criterion 5. It also leaves the guest exactly where the Problem Statement starts: a locked cart.

### 4. What happens to the cart while a payment is pending *(added in v2)*

**Option A: keep the lock, and make it visible and actionable everywhere the guest can hit it. (Recommended)**
- ✅ The invariant that makes money safe stays: **a cart becomes exactly one order.** A guest can't leave a QRIS payment pending, re-order the same drinks with cash, and later pay the saved QR. That would be two paid orders, a refund, and a double batch at the bar.
- ✅ Acceptance criterion 3 ("items come back, not blank") holds by construction: the items never left (D2). Expiry keeps its "Keranjang Anda masih tersimpan" promise for free.
- ✅ The fix for the invisible lock is presentation. The cart response gains the pending payment (D18), and each surface renders it (D21). No lifecycle changes.
- ❌ A guest who genuinely wants a *second*, separate order while one is unpaid must finish or cancel the first. That's accepted (Non-Goals).

**Option B: clear the cart at checkout, drop the lock, allow several pending payments per session.** *(Raised in review.)*
- ✅ It's a simple mental model: every checkout is a standalone order, and pending orders sit in history like paid ones.
- ✅ The guest can start a new order at any time.
- ❌ **It contradicts acceptance criterion 3.** A cancel would have to *rebuild* the cart from `transaction_items`. That needs merge rules for items the guest added since, and some rebuilt items may no longer be available.
- ❌ **Expiry regresses.** Today an expired QRIS payment leaves the guest with a full cart and one tap to retry. Under B, expiry either needs the same rebuild or throws the order away.
- ❌ **It enables accidental double orders.** Nothing stops "QRIS pending, re-order with cash, then pay the saved PNG". The supersede rule (D7) can't apply, because the two orders no longer share a cart.
- ❌ Every pending payment holds its own availability reservation and, for cash, sends its own `cash_pending` push to the KDS. A guest who re-orders twice holds stock three times and buzzes the barista three times.
- ❌ It's a larger rework than the feature: `Checkout`'s idempotency (QRIS D11), the freeze (QRIS D10), cart conversion and the expired-state copy all change.

**Option C: keep the lock, but let a cart write silently cancel the pending payment.**
- ✅ Zero new UI.
- ❌ It cancels a QRIS payment that may have just gone through (D4 would catch it, but the guest never asked). It also cancels a cash order while the guest is standing at the till. Cancelling must always be a confirmed choice (D22).

---

## System Design Overview

### Payment state machine: before → after

```
 before:                                   after (new edges in ═══):

            ┌──► paid                                  ┌──► paid ◄══════════════════╗
 pending ───┼──► expired ──(late pay)──► paid   pending ┼──► expired ──(late pay)──► paid
            └──► failed                                ├──► failed                  ║
                                                       └══► cancelled ══(late QRIS pay, D7)
                                                             ▲
                                     POST /payments/{ref}/cancel  (guest, owner session only)
                                     or: superseded by a late payment on an older
                                         payment of the same cart (D7)
```

`cancelled` is terminal for the guest and **never** reachable once `paid`. The only edge out of it is money actually arriving at DOKU (D7), which the system must record because the money is real. A cashier cannot take that edge (D8).

### The cancel path, end to end

```
 Guest on /orders/{ref}  (awaitingPayment | awaitingCashPayment, canCancel = true)
      │  taps "Batalkan pembayaran"  ─── or ───  presses Back (D14 guard)
      ▼
  PaymentCancelUsecase: REQUEST → confirming (dialog open)      (order-status polling continues, D13)
      │  "Ya, batalkan"
      ▼
  CONFIRM → cancelling ── POST /payments/{ref}/cancel ─────────────────────────────┐
                                                                                   ▼
                                           PaymentUsecase.CancelPayment  (one DB transaction)
                                             ├─ SELECT payment … FOR UPDATE        (D6)
                                             ├─ owner session?  else 404           (D3)
                                             ├─ status ≠ pending → return as-is    (idempotent, D3)
                                             ├─ QRIS: QueryQris (ignores 5 s floor)(D4)
                                             │     paid    → applyQrisStatus(paid) → return paid
                                             │     error   → log warn, continue
                                             │     [phase 9: CancelQris best-effort, D5]
                                             ├─ finalizeUncollectedPayment(cancelled)
                                             │     ├─ payments.status='cancelled',
                                             │     │  cancelled_at=now, cancel_reason='guest'
                                             │     ├─ availability released
                                             │     └─ transaction soft-deleted
                                             ├─ cash: enqueue KDS 'cash_cancelled' (phase 8, D16)
                                             └─ cart: untouched — status 'active', items intact (D2)
                                                                                   │
  settled(result) ◄────────────────────────────────────────────────────────────────┘
      ├─ payment.status = cancelled → router.replace('/t/{code}/cart')              (D15)
      ├─ payment.status = paid      → preparing ("Pembayaran Anda sudah diterima")
      └─ payment.status = expired   → expired view (unchanged "Kembali ke keranjang")

  On /t/{code}/cart: GET /carts/current → same items; ensureCartUnlocked finds no
  *pending* payment → edits allowed; Checkout → GetPendingPaymentByCartId finds none →
  brand-new transaction + payment, any method (unchanged Checkout code).
```

### The guest who left the countdown page *(v2)*

```
 Guest closes the tab while a payment is pending, later scans the table QR again
      │
      ▼
  /t/{code}  (menu)          GET /carts/current → { items…, pendingPayment: {ref, method, amount, expiredAt, canCancel} }
      │
      ├─ bottom bar:  "⏳ Menunggu pembayaran QRIS · Rp 45.000 · 04:12   [Lanjutkan pembayaran]"   (D21)
      │                     └─► /orders/{ref}  (countdown + "Batalkan pembayaran")
      │
      ├─ opens an item, picks options → CTA replaced by:                                   (D21, D22)
      │     "Anda masih punya pembayaran yang belum selesai…"
      │     [Lanjutkan pembayaran]   [Batalkan & tambah item]
      │                                   │  PaymentCancelAlert → POST /payments/{ref}/cancel
      │                                   ├─ cancelled / expired → cart refetch → ADD_ITEM (from the sheet's own state)
      │                                   │                         → cart = old items + new item, normal CartBar returns
      │                                   └─ paid → no add → /orders/{ref} ("Pembayaran sudah diterima")
      │
      ├─ /t/{code}/cart → items listed read-only; banner replaces Checkout:                 (D21)
      │     [Lanjutkan pembayaran]   [Batalkan pembayaran]
      │
      ├─ /orders (history) → the pending row, QRIS or cash → "Lanjutkan pembayaran"         (D19)
      │
      └─ a write races a lock created after the page loaded (another tab):                  (D23)
            400 → CartUsecase refetches instead of reverting → surfaces switch to the locked state

  Countdown on the bar reaches 0 → refetch cart; the server decides (sweeper / IsAwaitingPayment),
  pendingPayment becomes null → normal bar, writes allowed.
```

### Changed tables

One migration, the next in sequence (currently `000041`, created with `make migrate-create name=add_payment_cancellation`):

```sql
-- 000041_add_payment_cancellation.up.sql
ALTER TABLE payments
  ADD COLUMN cancelled_at  DATETIME    NULL AFTER paid_at,
  ADD COLUMN cancel_reason VARCHAR(16) NULL AFTER cancelled_at;   -- 'guest' | 'superseded'

-- 000041_add_payment_cancellation.down.sql
ALTER TABLE payments
  DROP COLUMN cancel_reason,
  DROP COLUMN cancelled_at;
```

- **No new table.** A cancelled payment is a `payments` row in a new state (D1). The `transactions` row is soft-deleted exactly as for `expired` (`deleted_at`). `carts` is not touched (D2).
- `payments.status` gains the value `cancelled`. It is `VARCHAR(16)`, so there is no DDL for that.
- Both new columns are nullable with no default, so the migration is non-breaking and the down migration is an exact reverse. The rationale for the columns rather than inferring from `status`/`updated_at` is D9.
- `kds_notifications.kind` gains the value `cash_cancelled` (phase 8). It is `VARCHAR(20)`, and the `(transaction_id, kind)` unique key from migration `000035` already allows a second row per transaction, so there is no DDL.

### New and changed API surface

| Method | Path | Auth | Change |
|---|---|---|---|
| `POST` | `/payments/{partnerReferenceNo}/cancel` | `RequireSessionId`, **owner session only** (an `X-Order-Access-Key` never authorises it, D3) | **New.** No body. Returns `PaymentResponse` with the payment's resulting status (`cancelled`, or `paid`/`expired`/`failed` if it had already left `pending`). `404` for an unknown or foreign reference. `400` while `ORDER_PAYMENT_CANCEL_ENABLED` is off (D11). |
| `GET` | `/payments/{partnerReferenceNo}` | unchanged | Response gains `canCancel` and `cancelReason`; `status` may be `cancelled`. |
| `POST` | `/carts/current/checkout` | unchanged | **No change.** After a cancel there is no pending payment, so it creates a new one with whatever `method` is sent. |
| `GET` | `/carts/current` (and every cart write, which returns the cart) | unchanged | `Cart` gains `pendingPayment: PendingPayment \| null`, set only while the lock is in force (`IsAwaitingPayment`, D18). |
| `GET` | `/payments` | unchanged | Filter widens from "paid, or pending cash" (`payment_repo.go:54`) to "paid, or pending (any method)" (D19). `cancelled` stays excluded, consistent with History D14. |
| `PUT` | `/transactions/{transactionId}/pay` (POS) | unchanged (`CheckAuth`) | New `400` when the order transaction's payment was cancelled by the guest (D8). |

Contract edits in `libs/api-contract/src/api.yaml`:

```yaml
  /payments/{partnerReferenceNo}/cancel:
    post:
      summary: Cancel the requesting session's own pending payment (idempotent; the response is the payment's resulting state)
      operationId: paymentCancel
      tags: [payment]
      parameters:
        - $ref: '#/components/parameters/PartnerReferenceNo'
      responses:
        '200': { content: { application/json: { schema: { $ref: '#/components/schemas/PaymentResponse' } } } }
        '400': { … Error }   # feature disabled
        '404': { … Error }   # unknown reference, or not this session's payment

    Payment:
      required: [ …existing…, canCancel ]
      properties:
        status:
          enum: [pending, paid, expired, failed, cancelled]     # + cancelled
        canCancel:                                              # new, server-computed (D10)
          type: boolean
        cancelReason:                                           # new, present only when cancelled
          type: string
          enum: [guest, superseded]

    Cart:
      properties:
        pendingPayment:                                         # new (v2, D18); absent/null when unlocked
          $ref: '#/components/schemas/PendingPayment'

    PendingPayment:                                             # new (v2)
      type: object
      required: [partnerReferenceNo, method, amount, expiredAt, canCancel]
      properties:
        partnerReferenceNo: { type: string }
        method:             { type: string, enum: [qris, cash] }
        amount:             { type: number }
        expiredAt:          { type: string, format: date-time }
        canCancel:          { type: boolean }                   # same rule as Payment.canCancel (D10)
```

`pendingPayment` is optional, so an older order-app build ignores it.

`PaymentSummary.status` gains `cancelled` too, for enum symmetry, even though `GET /payments` never returns such a row. Both clients are regenerated. `canCancel` is **required** but Go's zero value is `false`, so the regenerated Go model compiles and serialises `false` before any backend logic sets it. That is what lets the contract phase merge first.

### Changed backend files (`apps/api`)

| Layer | File | Change |
|---|---|---|
| Migration | `data/mysql/migrations/000041_add_payment_cancellation.{up,down}.sql` | two columns |
| Entity | `domain/payment_entity.go` | `PaymentStateCancelled`; `PaymentCancelReason` (`guest`, `superseded`); `Payment.CancelledAt`, `Payment.CancelReason`; `Payment.CanBeCancelledBy(sessionId, now)` |
| Repository port | `domain/payment_repository.go` | `GetPaymentByPartnerReferenceNoForUpdate`, `GetPaymentByTransactionIdForUpdate` (D6); `CancelQris` on `PaymentGatewayRepository` (phase 9) |
| Use case | `domain/payment_usecase.go` | new `CancelPayment`; `finalizeUncollectedPayment` takes the reason; `applyQrisStatus` accepts `cancelled` on its paid branch and supersedes a newer live payment (D7) |
| Use case | `domain/transaction_usecase.go` | `PayTransaction` refuses a guest-cancelled order transaction (D8); `settleOrderPayment` supersedes like D7 |
| Use case | `domain/kds_notification_entity.go` | `KdsNotificationKindCashCancelled` + message builder (phase 8) |
| MySQL | `data/mysql/payment_{entity,transformer,repo}.go` | columns, `FOR UPDATE` reads (`clause.Locking{Strength: "UPDATE"}`) |
| DOKU | `data/doku/payment_repo.go` | `CancelQris` (phase 9) |
| Mock | `data/mock/payment_repository.go` | regenerated via `go generate ./...` |
| REST | `presentation/restapi/payment_{handler,route,transformer}.go` | `Cancel` handler + route; `canCancel` / `cancelReason` serialisation |
| Config | `utils/env.go`, `.env.example`, `main.go` | `ORDER_PAYMENT_CANCEL_ENABLED` (D11), threaded into `NewPaymentUsecase` and `NewCartUsecase` |
| Entity | `domain/cart_entity.go` | `Cart.PendingPayment *Payment` (v2, D18) |
| Use case | `domain/cart_usecase.go` | `GetCurrentCart` and every write attach the awaiting payment. `ensureCartUnlocked`'s lookup is reused, so there's one definition of "locked" (v2) |
| REST | `presentation/restapi/cart_transformer.go` | serialise `pendingPayment`, with `canCancel` = flag (the requester is always the cart's owner) (v2) |
| MySQL | `data/mysql/payment_repo.go` | `paymentHistoryFilter` → `status = paid OR status = pending` (v2, D19) |

### Changed frontend slice (`libs/ui`, order app)

| Layer | File | Change |
|---|---|---|
| Entity | `domain/entities/Payment.ts` | `QrisPaymentStatus` += `'cancelled'`; `Payment.canCancel: boolean`; `Payment.cancelReason: 'guest' \| 'superseded' \| null` |
| Repository port | `domain/repositories/payment.ts` | `cancelPayment(reference): Promise<Payment>` |
| Data | `data/api/payment.ts`, `payment.transformer.ts`, `data/mock/payment.ts`, `src/__mocks__/api-contract.ts` | `paymentCancel` call + mapping; mock honours `setShouldFail` |
| Use case | `domain/usecases/orderStatus.ts` (+ test) | read-only `cancelled` state only (FR-2). The cancel dialog is **not** here any more (D20) |
| Use case | `domain/usecases/paymentCancel.ts` (+ test) | **new (v2).** `PaymentCancelUsecase`: `idle → confirming → cancelling → settled \| error`, shared by three handlers (FR-8, D20) |
| Hook | `presentation/handlers/hooks/usePaymentCancel.ts` | **new (v2).** Promoted to `hooks/` because ≥ 2 handlers use it (`docs/handlers.md`) |
| Component | `presentation/views/components/checkout/PaymentCancelAlert.tsx` (+ story) | method-aware confirmation on the base `ConfirmationAlert` |
| Component | `presentation/views/components/cart/PendingPaymentBar.tsx` (+ story) | **new (v2).** Replaces `CartBar` on the menu while locked: method, amount, countdown, "Lanjutkan pembayaran" (D21) |
| Component | `presentation/views/components/cart/PendingPaymentNotice.tsx` (+ story) | **new (v2).** The "payment is waiting" block with "Lanjutkan pembayaran" plus a configurable cancel action. Used by the item sheet, the cart page and cart-item edit (D21) |
| Screen | `presentation/views/screens/order/OrderStatusScreen.tsx` (+ stories) | cancel button under both awaiting variants; `cancelled` variant |
| Screen | `MenuItemDetailScreen`, `CartScreen`, `CartItemEditScreen` (+ stories) | **v2.** A `locked` prop swaps the add/checkout/save CTA for `PendingPaymentNotice`. Cart line items render read-only |
| Component | `presentation/views/components/orderHistory/OrderHistoryListItem.tsx` (+ story) | **v2.** Pending QRIS row ("Menunggu pembayaran QRIS"), beside the existing pending-cash row (D19) |
| Entity / data | `domain/entities/Cart.ts`, `data/api/cart.transformer.ts`, `data/mock/cart.ts` | **v2.** `Cart.pendingPayment: PendingPayment \| null` (D18). The mock gets a `setPendingPayment` helper for tests |
| Use case | `domain/usecases/cart.ts` (+ test) | **v2.** `MUTATE_ERROR` → `revalidating` (refetch) instead of reverting to `previousCart` (D23) |
| Handler | `presentation/handlers/order/OrderStatusHandler.tsx` (+ test) | maps new states; wires `usePaymentCancel`; `router.replace(cartPath)` after a guest cancel; arms the back guard |
| Handler | `MenuListHandler.tsx`, `CartHandler.tsx` (+ tests) | **v2.** Read `cart.pendingPayment`; render the bar, notice and banner; wire `usePaymentCancel`; "cancel and add" (D22) |
| Util | `utils/backNavigationGuard.ts` (+ `.native.ts` no-op, + test) | `installBackNavigationGuard(onBackAttempt): () => void` around `Router.beforePopState` (D14) |
| Hook | `presentation/handlers/hooks/useBackNavigationGuard.ts` | `useEffect` wrapper: arm while `enabled`, disarm on cleanup |

Untouched: `CheckoutUsecase`, `CustomerDetailsSheet`, `apps/order-web/**` pages (the `/orders/[reference]`, `/t/[code]` and cart pages already feed their composition roots everything they need, because `pendingPayment` rides on the cart the handlers already fetch).

---

## Design decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** | A cancel moves the payment to a new terminal state **`cancelled`**, through the existing `finalizeUncollectedPayment`, which gains a `reason` parameter. | This is the one existing code path that releases availability, soft-deletes the transaction and so unfreezes the cart. A second "give up" path would drift from it. **Rejected:** reusing `expired`, because it lies to the guest, to metrics and to Cash D23's un-delete path (Alternatives §1). **Rejected:** hard delete, because it orphans late DOKU money. |
| **D2** | Cancel **never touches the cart**. The cart stays `active` with its items, and it unlocks only because no payment is `pending` any more: `ensureCartUnlocked` and `Checkout`'s idempotency both read `GetPendingPaymentByCartId`, which filters `status = 'pending'`. | This is how acceptance criteria 3 and 4 hold "by construction" rather than by a restore step. No code copies items back, because they were never removed. Re-checkout is the unchanged `Checkout`, which prices the cart afresh, allocates a new transaction number and mints a new reference. |
| **D3** | `POST /payments/{ref}/cancel` is **owner-session only** and **idempotent**, and **the response is the truth**. `pending` becomes `cancelled`. Any other status is returned unchanged with `200`. There is no `409`. | The access key is a *read* credential (WA D4), so a WhatsApp link forwarded to a friend must not be able to cancel an order. Returning the resulting payment instead of an error means the client has one code path, "route by `status`", whether the guest cancelled, had already paid, or had just expired. That is the same shape as polling. |
| **D4** | For QRIS, cancel **asks DOKU first** (`QueryQris`, bypassing the 5 s `statusRequeryFloor` because this is a one-off guest action, not a poll). If DOKU says paid, it takes the normal paid path and returns `paid`. If the query errors, **the cancel proceeds**, logged at `warn`. | This closes the common race, "paid, webhook not yet here", with code that already exists. Failing closed on a gateway error would trap the guest at the exact moment DOKU is misbehaving, which is when they most want to switch to cash. The residual risk is owned by D7. |
| **D5** | Cancelling the QR **at DOKU** (`qr-mpm-cancel`) is a **best-effort, optional phase** (9), and nothing depends on it. A failure there is logged and never fails the guest's cancel. | This shrinks D7's window from "until the QR's own expiry" to near zero, where DOKU supports it. It is kept out of the critical path because the endpoint's availability for our merchant is unverified (Alternatives §2). The QRIS PRD's rule stands: confirm every path, header and response code against the DOKU dashboard before hard-coding it. |
| **D6** | **One lock: the `payments` row.** Every path that moves a payment out of `pending` (cancel, `ConfirmPayment`, the sweeper's `expireOne`, and `PayTransaction`'s settle) reads it with `SELECT … FOR UPDATE` before deciding. | Cancel introduces the first *guest-initiated* write that races a gateway write and a cashier write on the same row. Today these read-modify-write without a lock, which is harmless when every path converges on `paid`. It is not harmless when one of them is `cancelled`. Locking the same row in all of them serialises them, and whichever commits second sees the first's result. |
| **D7** | **Late money wins, and supersedes.** A paid result for a `cancelled` QRIS payment takes the existing `paid_late` path: un-delete, force-reserve, pay, convert cart. If the cart has a **newer live payment**, that one is finalised as `cancelled` with `cancel_reason = 'superseded'`. For cash it also enqueues `cash_cancelled` (D16). The same supersede runs in `settleOrderPayment` for Cash D23's late-cashier path. | The money is real, so its order must exist, as QRIS D5 already argues. A cart can become exactly one order, so the order the guest actually paid for wins, and the unpaid duplicate must not remain collectable. Without this, a cashier could take cash for a cart whose QRIS payment already landed: a double charge. This also fixes the same latent gap for `expired` → `paid_late`, which exists today. |
| **D8** | **A cashier cannot pay a guest-cancelled order.** Cash D23's un-delete-and-pay is limited to payments that are `expired`. When the linked payment is `cancelled`, `PayTransaction` returns `400 "order was cancelled by the guest"`. | This is the race rule Cash D21 asked for. A stale POS list can still show the cancelled order for a moment. Paying it would resurrect an order the guest walked away from, or worse, one they re-placed with QRIS (a double charge). An expired order is different: the guest never chose to leave. The error text is English, like the rest of the POS. |
| **D9** | Two nullable columns, `payments.cancelled_at` and `payments.cancel_reason` (`guest` \| `superseded`). | `updated_at` is overwritten by any later write, including D7's late-pay path, so it cannot answer "when was this cancelled". The reason drives the guest copy: "Anda membatalkan pembayaran" vs "Pesanan ini sudah dibayar lewat pembayaran sebelumnya". It also feeds the success metrics. **Rejected:** a `payment_events` audit table, which is a general audit log for one field. **Rejected:** no columns, which loses the reason. |
| **D10** | The API computes **`canCancel`**: `status = pending` and the requester is the owning session and the feature flag is on. The client shows the button and arms the back guard only on `canCancel`. | Eligibility is a server fact: ownership, the flag, and the pending state (which can flip under a poll). A client-side re-derivation would be a second copy of the rule. It also makes the frontend safe to ship before the backend. An older API sends `false`, so no button appears. |
| **D11** | Kill switch **`ORDER_PAYMENT_CANCEL_ENABLED`** (API env, default `false`). Off: `canCancel` is always `false` and the endpoint returns `400 "payment cancellation is not available"`. It is flipped on in phase 10. | This mirrors QRIS D20 and Cash D18. Every phase can merge and deploy with no guest able to cancel before the D6–D8 guards are all in. It is an API flag rather than a `NEXT_PUBLIC_` one because D10 already routes the decision through the server. One flag gates both the button and the endpoint, so they cannot disagree. |
| **D12** | ~~The confirmation's open/closed state lives in `OrderStatusUsecase`.~~ **Superseded by D20 (v2).** It still lives in a use case rather than handler `useState`, for the reason given here, but in a shared one. | Two triggers (button and Back) open it, and something asynchronous must be able to close it (D13). `CartHandler`'s `isClearConfirmationOpen` `useState` works there because nothing can invalidate a "clear cart?" prompt. Here something can. |
| **D13** | **Paid wins over an open dialog.** Polling continues while the confirmation is open. When `OrderStatusUsecase` leaves the awaiting states (a poll reports `paid`, or `EXPIRE`), the handler dispatches `DISMISS` to `PaymentCancelUsecase` *(mechanism revised in v2, per D20)*. `COUNTDOWN_ELAPSED` still issues the final poll (QRIS D12a). | A guest must never be able to confirm a cancel against a screen that is already stale. Even if they do, D3 and D4 make the server return `paid`, so the worst case is one extra round trip. |
| **D14** | Back is intercepted by a web-only helper, `utils/backNavigationGuard.ts`, around `Router.beforePopState`. It is armed **only while `canCancel`** and the state is awaiting. A pop is swallowed (`return false`), the current URL is re-pushed, and `REQUEST` is dispatched to `PaymentCancelUsecase` (D20). `.native.ts` is a no-op. | Alternatives §3. The guard is a *handler* effect: it is router behaviour, which `docs/handlers.md` assigns to the handler, reached through a hook so the handler stays declarative. It disarms on every other state, so a paid or expired page has a normal Back. |
| **D15** | After a guest-confirmed cancel the handler calls **`router.replace('/t/{code}/cart')`**. The status page for a cancelled payment (reached by reload or by an old link) renders a `cancelled` variant with "Kembali ke keranjang". | `replace`, not `push`, so Back from the cart does not return to a dead countdown. The cart page remounts, so `CartUsecase` refetches and `CheckoutUsecase` starts at `idle` with the SSR-prefilled name and WhatsApp number. The guest is one tap from the method sheet. |
| **D16** | A cancelled **cash** order sends the KDS a **`cash_cancelled`** push ("Cash order #12 cancelled — Meja 4") through the existing outbox. It bypasses the station rule, as Cash D9's `cash_pending` does. | The `cash_pending` push (Cash D10) may already have sent a barista to the till. Leaving them waiting for a guest who has left is the staff-side equivalent of the guest's locked cart. QRIS cancels send nothing, because nothing was sent when the QR was minted. |
| **D17** | Cancelled payments are **not** order-history rows, and cancelled transactions are **invisible** on the POS list (soft-deleted, same as `expired`). | This is consistent with History D14: only paid orders and pending payments are rows (pending QRIS since D19). A cancelled attempt is not an order. Staff reporting on cancels reads `payments` (D9). |
| **D18** *(v2)* | The cart **carries its lock**. `Cart.pendingPayment` holds `{ partnerReferenceNo, method, amount, expiredAt, canCancel }`, set when and only when `ensureCartUnlocked` would refuse a write (`IsAwaitingPayment(now)`), on `GET /carts/current` and on every write response. | Every surface that can hit the lock already reads the cart: the menu for its `CartBar`, the cart page, cart-item edit. Putting the lock *on the cart* means no new request, no extra SSR call, and one server-side definition of "locked" shared by the rule and its explanation. **Rejected:** a separate `GET /payments/current` that each page also fetches. It's a second round trip, and a second place for "locked" to be computed and drift. |
| **D19** *(v2)* | Order history lists **pending payments of both methods**. The row reads "Menunggu pembayaran" and links to the countdown. This widens History D14 and Cash D17, which excluded pending QRIS. | Cash D17 kept pending QRIS out because the row "would be a link that dies within five minutes". That is still true, but now the sweeper removes it within one tick of expiring, and the countdown page offers cancel. So the row is a live way back, not a dead link. It is the recovery path the reviewer asked for, for a guest whose tab is gone. |
| **D20** *(v2)* | The cancel dialog and request are their own finite-state machine, **`PaymentCancelUsecase`** (`idle → confirming → cancelling → settled \| error`, params `{ reference, method }`), reached through a shared `usePaymentCancel` hook. `OrderStatusUsecase` keeps only the read-only `cancelled` state. Supersedes D12. | Three handlers now cancel: `OrderStatusHandler`, `MenuListHandler` and `CartHandler`. Copying the dialog states into `OrderStatusUsecase`, `CartUsecase` and the menu machines would triplicate one flow. Each handler bridges the result into its own machine with an effect, as `CartHandler` already bridges checkout errors into a cart refetch (`CartHandler.tsx:89-92`). |
| **D21** *(v2)* | **The lock is shown wherever a write could hit it**, always offering "Lanjutkan pembayaran", and also "Batalkan" when `canCancel`. On the menu, `PendingPaymentBar` replaces `CartBar`. In the item sheet, the notice replaces "Tambah ke keranjang", but browsing and option-picking still work. On the cart page, line items are read-only and a banner replaces Checkout. In cart-item edit, the notice replaces Save. | Goal 6. The guest learns about the pending payment where they're trying to act, and every notice has a way forward. Browsing stays open because looking at the menu costs nothing and is often why the guest came back. The bar's countdown makes the lock's natural end visible. |
| **D22** *(v2)* | The item sheet's cancel action is **"Batalkan & tambah item"**: one confirmation, then the add. On `cancelled` or `expired` the handler refetches the cart and dispatches `ADD_ITEM` from `MenuItemDetailUsecase`'s current variant, amount and note (the sheet stays open until then). On `paid` nothing is added and the guest goes to `/orders/{ref}`. | The guest opened the sheet to add a drink, so the flow should end with the drink in the cart, not at a cancel button somewhere else. The intent needs no new storage because it already lives in the sheet's own machine. Adding after a `paid` result would silently start a second order, so it doesn't. |
| **D23** *(v2)* | **No cart write fails silently.** `CartUsecase`'s `MUTATE_ERROR` goes to `revalidating` (refetch) instead of reverting to `previousCart`. It keeps `errorMessage`, and `MenuListHandler` and `CartHandler` render it. A lock-caused `400` therefore arrives with a fresh cart whose `pendingPayment` switches the screen to D21's locked state. | This is the backstop for a lock the page didn't know about, for example one created from another tab after the menu loaded. It needs no new error code: the refetched cart says *why*. Refetching on any write error is also simply more correct than trusting a snapshot the server just disagreed with. |

---

## Proposed Solution

### FR-1: Schema and domain state (API)

The migration above. `domain.PaymentStateCancelled`, `domain.PaymentCancelReason{Guest,Superseded}`, `Payment.CancelledAt *time.Time`, `Payment.CancelReason *PaymentCancelReason`. `Payment.CanBeCancelledBy(sessionId string, now time.Time) bool`, which is true only when `Status == pending` and `SessionId == sessionId`. The flag is applied by the use case, not the entity. MySQL entity and transformer carry both columns. `PaymentRepository` gains `GetPaymentByPartnerReferenceNoForUpdate` and `GetPaymentByTransactionIdForUpdate`, implemented with `clause.Locking{Strength: "UPDATE"}`. The mock is regenerated. **No behaviour change:** nothing writes `cancelled` yet.

### FR-2: Contract (API contract + `libs/ui` data)

The `api.yaml` edits above, then both clients regenerated. In `libs/ui`: the entity fields, `payment.transformer.ts` mapping (`cancelReason` → `null` when absent), `PaymentRepository.cancelPayment`, `ApiPaymentRepository.cancelPayment` (attaches `X-Session-Id`, **never** the access key), `MockPaymentRepository.cancelPayment` (flips a pending payment to `cancelled` and honours `setShouldFail`), and the `api-contract` Jest stub. `stateTypeForPayment` maps `cancelled` to a new read-only `cancelled` state, and `OrderStatusScreen` gains the `cancelled` variant: an `EmptyView` with "Pembayaran dibatalkan", subtitle chosen by `cancelReason`, action "Kembali ke keranjang". This part cannot wait for the cancel flow, because the exhaustive `match(payment.status)` stops compiling the moment the enum grows.

### FR-3: `PaymentUsecase.CancelPayment` (API)

`CancelPayment(ctx, sessionId, partnerReferenceNo) (Payment, Transaction, *Error)`, in one `BeginTransaction`:

1. Flag off ⇒ `400 bad_request "payment cancellation is not available"` (D11).
2. `GetPaymentByPartnerReferenceNoForUpdate`. If not found, or `payment.SessionId != sessionId` ⇒ `404 "payment not found"`. The access key is deliberately not consulted (D3).
3. `status != pending` ⇒ return it unchanged (D3).
4. QRIS (`RequiresGateway()`): call `QueryQris`. If the result is `paid`, run `applyQrisStatus` and return (the outcome is `paid`, so the KDS dispatch is triggered after commit, as `ConfirmPayment` does). If the query errors, log at `warn` with the reference and continue (D4). *(Phase 9 inserts the best-effort `CancelQris` here.)*
5. `finalizeUncollectedPayment(payment, cancelled, reason=guest)`. This sets `cancelled_at`, releases availability and soft-deletes the transaction.
6. Cash: enqueue `cash_cancelled` *(phase 8)*.
7. Return the payment and its transaction, so the handler serialises the same `PaymentResponse` shape as `GET`.

`finalizeUncollectedPayment` gains a `reason *PaymentCancelReason` parameter that is non-nil only for `cancelled`. The existing expired/failed callers pass `nil`.

**Tests** (`payment_usecase_test.go`, mocks): cash pending → cancelled, with reservation released and transaction soft-deleted; QRIS pending with DOKU pending → cancelled; QRIS with DOKU **paid** → paid, wallet credited, cart converted, and **not** cancelled; QRIS with a DOKU error → cancelled with a warn log; each non-pending status returned unchanged; foreign session → 404; valid access key but foreign session → 404; flag off → 400; the cart row is never updated.

### FR-4: Endpoint, `canCancel`, flag (API)

`PaymentHandler.Cancel` → `CancelPayment` → the existing `ToApiPayment` transformer, which now sets `canCancel = flag && payment.CanBeCancelledBy(requestSessionId, now)` and `cancelReason`. `GET /payments/{ref}` goes through the same transformer, so the field is correct on every read. Route: `router.HandleFunc("/payments/{partnerReferenceNo}/cancel", RequireSessionId(handler.Cancel)).Methods(http.MethodPost, http.MethodOptions)` in `payment_route.go`. `ORDER_PAYMENT_CANCEL_ENABLED` goes in `utils/env.go` and `.env.example` (empty = `false`) and is threaded through `NewPaymentUsecase` and `NewCartUsecase`. The latter feeds `pendingPayment.canCancel` (FR-13); if phase 11 hasn't merged yet, whichever of 4 and 11 lands second wires it. Handler tests: a `200` for each resulting status, `404`, `400` with the flag off, and `canCancel` `true` for the owner but `false` for an access-key reader.

### FR-5: Late-payment supersede, cashier guard, locks (API)

- `applyQrisStatus`: its paid branch accepts `pending | expired | cancelled`. A `cancelled` payment takes the same un-delete + force-reserve route `expired` does, and the outcome is `paid_late`. After converting the cart, a new helper `supersedeLivePayments(ctxWithTx, cartId, exceptPaymentId)` finalises any other `pending` payment on that cart as `cancelled`/`superseded` and logs at `warn` (D7).
- `TransactionUsecase.PayTransaction`: read the linked payment with `GetPaymentByTransactionIdForUpdate` **before** the D23 un-delete. If it is `cancelled`, return `400 "order was cancelled by the guest"`. `settleOrderPayment` calls the same supersede helper (D7, D8).
- `ConfirmPayment` and `expireOne` switch their payment read to the `ForUpdate` variant (D6).

Tests: a late paid webhook on a cancelled QRIS payment pays it, and it supersedes a newer pending cash payment on the same cart, which leaves that payment's transaction soft-deleted with its reservation released. A late paid webhook on an **expired** payment with a newer pending payment supersedes it too (the pre-existing gap). A cashier paying a cancelled order gets 400 with no wallet, income, or KDS writes. A cashier paying an expired order is unchanged (Cash D23). A payment already `paid` is still a no-op (QRIS D14).

### FR-6: Cancel the QR at DOKU (API, optional)

`PaymentGatewayRepository.CancelQris(ctx, CancelQrisInput{PartnerReferenceNo, GatewayReferenceNo}) *Error`. `data/doku/payment_repo.go` implements SNAP `qr-mpm-cancel` with the existing symmetric signing. Every path, header, field and response code must be confirmed against the DOKU dashboard for our merchant, and the PR must cite the page. A DOKU response meaning "already paid" is mapped to a sentinel error, and `CancelPayment` answers it by re-querying and paying. Any other error is logged and ignored (D5). The e2e DOKU stub (`apps/order-web-e2e/src/utils/dokuStub.ts`) gains the endpoint.

### FR-7: KDS `cash_cancelled` (API)

`KdsNotificationKindCashCancelled = "cash_cancelled"`. `BuildKdsPushMessage` gets a third title/body pair: "Cash order #12 cancelled — Meja 4" / "Guest cancelled. Don't wait at the till." It is enqueued in `CancelPayment` (cash only) and in the supersede helper when the superseded payment is cash. It is dispatched after commit via `TriggerDispatch`, and it bypasses `ShouldNotify` like `cash_pending` (Cash D9). If the transaction has no `cash_pending` row, skip it: nothing was announced, so there is nothing to retract.

### FR-8: `PaymentCancelUsecase` (frontend) *(rewritten in v2, D20)*

`domain/usecases/paymentCancel.ts`. It is one machine per pending payment, shared by the status page, the menu and the cart:

```ts
type Context = {
  reference: string;
  method: PaymentMethod;
  result: Payment | null;        // the server's answer (D3): cancelled | paid | expired | failed
  errorMessage: string | null;
};

export type PaymentCancelState = (
  | { type: 'idle' }
  | { type: 'confirming' }       // PaymentCancelAlert open
  | { type: 'cancelling' }       // POST /payments/{ref}/cancel in flight
  | { type: 'settled' }          // result holds the resulting payment; the handler routes on result.status
  | { type: 'error' }            // dialog closed, errorMessage set; REQUEST reopens
) & Context;

export type PaymentCancelAction =
  | { type: 'REQUEST' }          // button, Back guard, banner, or "Batalkan & tambah item"
  | { type: 'DISMISS' }          // "Lanjutkan pembayaran", or the handler closing it (D13)
  | { type: 'CONFIRM' }
  | { type: 'CANCEL_SUCCESS'; payment: Payment }
  | { type: 'CANCEL_ERROR'; message: string };
```

The params are `{ reference, method }`. A handler whose pending payment can change (the menu and cart, after a refetch) constructs the use case from the current `pendingPayment`. `onStateChange` calls `PaymentRepository.cancelPayment` in `cancelling`. `usePaymentCancel` lives in `presentation/handlers/hooks/`, because three handlers use it.

`OrderStatusUsecase` gains **only** the read-only `cancelled` state (FR-2). After a settled cancel, `OrderStatusHandler` bridges with an effect: `cancelled` → `router.replace(cartPath)`, `paid` → `orderStatus.dispatch({ type: 'FETCH' })` (to show preparing), and `expired`/`failed` → `FETCH` (to show the expired view). When `orderStatus` leaves the awaiting states while the dialog is open, the handler dispatches `DISMISS` (D13).

`paymentCancel.test.ts` (`UsecaseTester` + `MockPaymentRepository`) covers: request → dismiss → idle with no request made; request → confirm → `settled` with a `cancelled` result; a server answer of `paid`, then of `expired`, each carried in `result`; an error → `error` with the message, then request → `confirming` again; `CONFIRM` ignored outside `confirming`.

### FR-9: Status-page UI (frontend)

- `OrderStatusScreen` awaiting variants gain `canCancel`, `onCancelPress`, `cancelConfirmation: { isOpen, method, isCancelling, onConfirm, onDismiss }` and `cancelErrorMessage`. A secondary (ghost) **"Batalkan pembayaran"** button sits below the payment view, after "Simpan QR" and the countdown, so it is never the first thing under the thumb. It is rendered only when `canCancel`.
- `PaymentCancelAlert` builds on the base `ConfirmationAlert` (`components/base/ConfirmationAlert`, already used by `CartScreen`'s clear-cart prompt), with copy chosen by method (FR-12). The confirm button shows a spinner while `cancelling`. It is shared by all three screens.
- `OrderStatusHandler` maps the new states exhaustively, wires `usePaymentCancel` as FR-8 describes, and arms the back guard with `enabled = payment.canCancel && state ∈ awaiting*`.
- Stories: each awaiting variant with and without `canCancel`, dialog open for QRIS and for cash, cancelling, error, and `cancelled` for both reasons.
- `OrderStatusHandler.test.tsx` (real use cases, mock repository, accessible roles): the button is hidden when `canCancel` is false; clicking it opens the dialog; "Lanjutkan pembayaran" closes it; "Ya, batalkan" → `router.replace('/t/{code}/cart')`; a cancel answered with `paid` shows the preparing view and does not navigate; a poll reporting `paid` while the dialog is open closes it.

### FR-10: Back-button guard (frontend)

`utils/backNavigationGuard.ts`:

```ts
export function installBackNavigationGuard(onBackAttempt: () => void): () => void
```

It is a no-op when `typeof window === 'undefined'`. It registers `Router.beforePopState`. On a pop it restores the entry (`window.history.pushState(window.history.state, '', currentAsPath)`), calls `onBackAttempt`, and returns `false`. A re-entrancy flag ignores the pop caused by its own restore. The returned disposer re-registers `Router.beforePopState(() => true)`. `backNavigationGuard.native.ts` exports a no-op with the same signature. `useBackNavigationGuard(enabled, onBackAttempt)` is a `useEffect` that installs while `enabled` and disposes on cleanup.

Tests: `backNavigationGuard.test.ts` against the Jest `next/router` stub (the registered callback returns `false`, calls the handler, and the disposer restores `true`). A Playwright e2e in phase 10 is the real proof: `page.goBack()` on a pending payment shows the dialog, and the URL is still `/orders/{ref}`. **Manual check:** Android Chrome hardware back and iOS Safari edge-swipe.

### FR-11: E2E, docs, enable

`apps/order-web-e2e/src/cancelPayment.spec.ts`:

1. QRIS: checkout → cancel → confirm → on the cart, items intact → edit an item succeeds → checkout with cash → cash instructions.
2. Cash: checkout → Back → the dialog appears → dismiss → still on the countdown → Back → confirm → cart.
3. Paid-before-cancel: stub DOKU as paid → cancel → preparing view, not the cart.
4. POS: pay a cancelled cash order through the API → 400.
5. *(v2)* Left the page: QRIS checkout → open a fresh page on `/t/{code}` → the pending-payment bar is visible → open an item → the notice replaces "Tambah ke keranjang" → "Batalkan & tambah item" → confirm → the cart holds the original items **plus** the new one.
6. *(v2)* Cart banner: cash checkout → `/t/{code}/cart` → line items read-only, banner shown → "Lanjutkan pembayaran" → countdown for the same reference.
7. *(v2)* History: QRIS checkout → `/orders` lists it as pending → tap → countdown.

Docs: a docs-site page or section for the order payment flow, per the `docs-site-page` skill. `ORDER_PAYMENT_CANCEL_ENABLED=true` goes in the production environment file.

### FR-12: Copy (Bahasa Indonesia; POS strings English)

| Where | Copy |
|---|---|
| Button | **Batalkan pembayaran** |
| Dialog title | **Batalkan pembayaran?** |
| Dialog body: QRIS | "Jika Anda **sudah membayar**, jangan batalkan — tunggu beberapa saat hingga pembayaran terkonfirmasi. Jika dibatalkan, QR ini tidak berlaku lagi dan pesanan kembali ke keranjang. Anda bisa memilih metode pembayaran lain." |
| Dialog body: cash | "Pesanan Anda akan dibatalkan dan kasir tidak lagi menunggu pembayaran Anda. Isi keranjang tetap tersimpan, dan Anda bisa memilih metode pembayaran lain." *(v2: no `#{n}`, because the menu and cart only have `pendingPayment`, which carries no transaction number)* |
| Dialog actions | **Ya, batalkan** (destructive) · **Lanjutkan pembayaran** |
| Cancel failed | "Gagal membatalkan pembayaran. Silakan coba lagi." |
| `cancelled` / `guest` | "Pembayaran dibatalkan" · "Keranjang Anda masih tersimpan." · **Kembali ke keranjang** |
| `cancelled` / `superseded` | "Pembayaran dibatalkan" · "Pesanan ini sudah dibayar lewat pembayaran sebelumnya." · **Lihat riwayat pesanan** |
| Cancel answered `paid` | Preparing view (unchanged) |
| POS pay error | "This order was cancelled by the guest." |
| *(v2)* Menu bar | "⏳ Menunggu pembayaran {QRIS \| tunai} · {Rp amount} · {mm:ss}" · **Lanjutkan pembayaran** |
| *(v2)* Notice (item sheet, cart, item edit) | "Anda masih punya pembayaran yang belum selesai. Selesaikan atau batalkan dulu untuk mengubah pesanan." |
| *(v2)* Notice actions | **Lanjutkan pembayaran** · item sheet: **Batalkan & tambah item** · cart and item edit: **Batalkan pembayaran** |
| *(v2)* "Cancel and add" answered `paid` | Goes to the countdown page, which shows the preparing view; nothing is added |
| *(v2)* Cart write failed for another reason (D23) | "Gagal memperbarui keranjang. Silakan coba lagi." |
| *(v2)* History row, pending QRIS | "Menunggu pembayaran QRIS" · tap → countdown |

### FR-13: The cart carries its lock (API + contract + `libs/ui` data) *(v2, D18)*

- `domain.Cart.PendingPayment *Payment`. `CartUsecase` gets a private `attachPendingPayment(ctx, cart)`, built on the same `GetPendingPaymentByCartId` + `IsAwaitingPayment(now)` pair `ensureCartUnlocked` uses. Both call one helper, `findAwaitingPayment`, so "locked" and "shown as locked" can't disagree. It runs on `GetCurrentCart` and at the end of every write, so the returned cart is always current.
- `cart_transformer.go` serialises `pendingPayment` with `canCancel = ORDER_PAYMENT_CANCEL_ENABLED`. Every cart request is its own session's cart, so the ownership half of D10 always holds.
- Contract: `Cart.pendingPayment` (optional) and the `PendingPayment` schema. Both clients are regenerated.
- `libs/ui`: `Cart.pendingPayment: PendingPayment | null`, `cart.transformer.ts`, and `MockCartRepository.setPendingPayment(p | null)`. When it is set, the mock's writes reject the way the API does, so handler tests can drive D23.

**Tests:** `cart_usecase_test.go`: no payment → `nil`; pending and unexpired → set; pending but past `expired_at` → `nil` (and a write succeeds, as today); cancelled/expired/paid → `nil`. `cart_handler_test.go`: the JSON shape, and `canCancel` following the flag. `cart.transformer` test in `libs/ui`.

### FR-14: Pending QRIS in order history (API + `libs/ui`) *(v2, D19)*

`paymentHistoryFilter` (`payment_repo.go:54`) becomes `session_id = ? AND deleted_at IS NULL AND status IN ('paid','pending')`. `OrderHistoryListItem` generalises its `isAwaitingCashPayment` branch (`OrderHistoryListItem.tsx:74`) to any pending method, with per-method copy (FR-12). A pending row links to `/orders/{reference}`, exactly as the cash row already does. **Tests:** repository test for the filter; stories and a list-item test for pending QRIS.

### FR-15: The locked cart is visible (`libs/ui`) *(v2, D21, D23)*

- **`CartUsecase` (D23):** `MUTATE_ERROR` goes to `revalidating` (refetch) and keeps `errorMessage`. It does not revert to `previousCart`. The handlers render `errorMessage` whenever the refetched cart is *not* locked. A locked cart is its own explanation.
- **Menu (`MenuListHandler`):** if `cart.pendingPayment` is set, render `PendingPaymentBar` instead of `CartBar`. Its countdown reaching zero dispatches a cart `FETCH`, and the server decides whether the lock is gone. "Lanjutkan pembayaran" → `router.push('/orders/{ref}')`. `MenuItemDetailScreen` gets `lockedNotice: PendingPaymentNoticeProps | null`. When it is non-null, the notice replaces the add CTA, while options, amount and note stay interactive.
- **Cart (`CartHandler`):** if locked, `CartScreen` gets `lockedNotice`. Line items render without edit/remove affordances, the clear-cart action is hidden, and the notice replaces Checkout. `CartItemEditScreen` gets the same `lockedNotice` in place of Save. (Tapping a line normally opens edit; it is disabled while locked, but a deep link through `CartQueryRepository`'s selected item could still open it.)
- In this phase the notices offer **only** "Lanjutkan pembayaran". The cancel actions arrive in phase 14.

**Tests:** `cart.test.ts`: a failed write refetches and adopts the server cart. `MenuListHandler.test.tsx`: the locked bar replaces `CartBar`; the item sheet shows the notice and no add button; the continue action routes to `/orders/{ref}`; an add rejected by a lock created after load switches the sheet to the notice. `CartHandler.test.tsx`: line items are read-only and the banner replaces Checkout.

### FR-16: Cancel from the menu and the cart (`libs/ui`) *(v2, D22)*

- `MenuListHandler` and `CartHandler` wire `usePaymentCancel` from `cart.pendingPayment`, and render `PaymentCancelAlert`. The notice's cancel action appears only when `pendingPayment.canCancel`.
- **Item sheet: "Batalkan & tambah item"** → `REQUEST`. On `settled`:
  - `cancelled` or `expired`: cart `FETCH`, then `ADD_ITEM` with `menuItemDetail.state`'s variant, amount and note, then `CLEAR_ITEM`. This is the same dispatch `onAddToCartPress` makes today. The sheet stays open until then.
  - `paid`: `router.push('/orders/{ref}')`.
- **Cart banner and item edit: "Batalkan pembayaran"** → `REQUEST`. On `settled` with `cancelled`/`expired`, cart `FETCH`, and the page becomes editable in place. With `paid`, route to the countdown.

**Tests:** `MenuListHandler.test.tsx`: cancel-and-add ends with the old items plus the new one in `MockCartRepository`; a `paid` answer adds nothing and routes; dismissing leaves the sheet open and locked. `CartHandler.test.tsx`: cancel from the banner makes the items editable and Checkout reappear.

---

## Phased plan

Fourteen PRs (v1's ten plus 11–14 from v2). Each merges to `main` green and shippable. **No guest can cancel before phase 10**, because `ORDER_PAYMENT_CANCEL_ENABLED` is off (D11) and `canCancel` is therefore `false` everywhere (D10). Three v2 phases are guest-visible improvements that are useful even without cancel, so they ship as soon as they merge: 12 (pending QRIS in history), 13 (the locked cart explains itself and offers "continue"), and D23's end to silent write failures (in 13).

| # | Phase | Side | Touches | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | Schema and domain state | API | migration `000041`, `payment_entity.go`, `payment_repository.go`, mysql payment files, mock | — | A |
| 2 | Contract + read-only `cancelled` state | contract + `libs/ui` | `api.yaml`, `Payment.ts`, payment repo/transformer/mock, `orderStatus.ts`, `OrderStatusScreen` | — | A |
| 3 | Back-navigation guard utility | `libs/ui/utils` | `backNavigationGuard{,.native}.ts`, test, hook | — | A |
| 11 | **v2** The cart carries its lock | API + contract + `libs/ui` data | `cart_entity.go`, `cart_usecase.go`, `cart_transformer.go`, `api.yaml`, `Cart.ts`, `cart.transformer.ts`, cart mock | — | A |
| 12 | **v2** Pending QRIS in order history | API + `libs/ui` | `payment_repo.go`, `OrderHistoryListItem` | — | A |
| 4 | `CancelPayment` + endpoint + flag | API | `payment_usecase.go`, `payment_{handler,route,transformer}.go`, env | 1, 2 | B |
| 5 | Late-payment supersede, cashier guard, locks | API | `payment_usecase.go` (`applyQrisStatus`, `expireOne`), `transaction_usecase.go` | 1 | B |
| 6 | Cancel machine + status-page cancel flow *(rescoped in v2)* | `libs/ui` | `paymentCancel.ts`, `usePaymentCancel`, `PaymentCancelAlert`, `OrderStatusScreen`, `OrderStatusHandler` | 2 | B |
| 13 | **v2** The locked cart is visible | `libs/ui` | `cart.ts` (D23), `PendingPaymentBar`, `PendingPaymentNotice`, `MenuItemDetailScreen`, `CartScreen`, `CartItemEditScreen`, `MenuListHandler`, `CartHandler` | 11 | B |
| 7 | Back button opens the confirmation | `libs/ui` | `OrderStatusHandler` (+ test) | 3, 6 | C |
| 8 | KDS `cash_cancelled` | API | `kds_notification_entity.go`, `payment_usecase.go` | 4 (+5 for the supersede call site) | C |
| 9 | Cancel the QR at DOKU *(optional)* | API | `payment_repository.go`, `data/doku/payment_repo.go`, `payment_usecase.go`, e2e DOKU stub | 4 | C |
| 14 | **v2** Cancel from the menu and the cart | `libs/ui` | `MenuListHandler`, `CartHandler`, notice actions | 6, 13 | C |
| 10 | E2E, docs, enable | all | `cancelPayment.spec.ts`, docs-site, prod env | 4, 5, 7, 12, 14 (+8, +9 if in scope) | D |

### Dependency graph

An arrow means "does not compile, or has nothing to test, without". Anything not connected can be built at the same time by different people.

```
  wave A                     wave B                          wave C                     wave D

  1  schema + domain ──┬──►  4  CancelPayment ─────────┬──►  8  KDS cash_cancelled ──┐
     (API)             │        + endpoint + flag      │        (API)               │
                       │        (API)     ▲            └──►  9  DOKU qr-mpm-cancel ─┤
                       │                  │                     (API, optional)     │
                       └──►  5  supersede + cashier ───────────(8 also uses 5)──────┤
                                guard + locks (API)                                 │
                                          │                                         │
  2  contract + read- ────────────────────┘                                         │
     only `cancelled`  ──►  6  cancel machine + ───┬───►  7  Back → confirm ────────┤
     (contract + ui)           status-page flow    │         (ui)    ▲              ├──► 10 e2e
                               (ui)                │                 │              │       docs
  3  back-guard util (ui) ─────────────────────────┼─────────────────┘              │       enable
                                                   │                                │
  11 cart carries ─────►  13 locked cart is ───────┴───►  14 cancel from menu ──────┤
     its lock               visible (ui)                     and cart (ui)          │
     (API+contract+ui)                                                              │
                                                                                    │
  12 pending QRIS in order history (API + ui) ──────────────────────────────────────┘
```

**Waves** (everything in a wave can run concurrently):

| Wave | Phases | Notes |
|---|---|---|
| **A** | **1, 2, 3, 11, 12** | Five independent starts. 11 and 12 need none of the cancel machinery. 12 ships a guest-visible improvement on its own. |
| **B** | **4, 5, 6, 13** | 4 needs 1 and 2 (the generated `paymentCancel` model). 5 needs only 1. 6 needs only 2, because it runs against `MockPaymentRepository` behind `canCancel = false`. 13 needs only 11. |
| **C** | **7, 8, 9, 14** | 14 joins the two frontend tracks: the cancel machine (6) and the locked-cart surfaces (13). 9 is optional (D5). |
| **D** | **10** | Needs every phase that is in scope. |

**Critical paths**, all four deep: **2 → 6 → 14 → 10**, **11 → 13 → 14 → 10**, **2 → 6 → 7 → 10**, and **1 → 4 → 8 → 10**. v2 added width, not depth. With three or four people the calendar length is still four PRs plus phase 10's device check.

**File contention**, the real constraint beyond the graph:

- **4, 5, 8 and 9 all edit `apps/api/domain/payment_usecase.go`.** 4 adds `CancelPayment`, 5 edits `applyQrisStatus`/`expireOne`, and 8/9 insert one call each into `CancelPayment`. They touch different functions, so conflicts are mechanical, but give the file one owner to land them in order 4 → 5 → 8 → 9.
- **2 and 11 both edit `libs/api-contract/src/api.yaml`** (different schemas) and both regenerate clients. Generated output is gitignored, so this resolves itself.
- **4 and 11 both touch the flag wiring** (`main.go`, `NewCartUsecase`). Whichever lands second wires `pendingPayment.canCancel` to the flag (FR-4).
- **13 and 14 both edit `MenuListHandler.tsx` and `CartHandler.tsx`** (and their tests). They are sequential in the graph.
- **6 and 7 both edit `OrderStatusHandler.tsx`**, and **2 and 6 both edit `orderStatus.ts`/`OrderStatusScreen.tsx`.** Both pairs are sequential.

**One person alone:** 11 → 13 → 12 → 1 → 2 → 4 → 5 → 6 → 14 → 3 → 7 → 8 → 10 (→ 9 later). This ships the review's concern first: after 13 and 12, a guest who left the countdown page can always find their way back, before any cancel code exists.

### Phase 1: Schema and domain state (API)

**Depends on:** nothing.
**Deliver:** FR-1. Migration pair via `make migrate-create`. Entity constants and fields. `CanBeCancelledBy`. The two `ForUpdate` repository methods and their MySQL implementations. The regenerated mock. No use case uses any of it yet.
**Tests:** entity test for `CanBeCancelledBy` (owner + pending; foreign session; each non-pending status). A MySQL transformer round-trip for both columns.
**Done when:** `make migrate-up` then `migrate-down 1` round-trips cleanly on a copy of prod schema, and `npx nx run api:test` is green.

### Phase 2: Contract + read-only `cancelled` state (contract + `libs/ui`)

**Depends on:** nothing.
**Deliver:** FR-2. `api.yaml` edits and both clients regenerated. TS entity, transformer, repository port, API and mock implementations, and the Jest `api-contract` stub. The `cancelled` state and screen variant, with stories for both reasons. **No cancel button yet.**
**Tests:** `payment.test.ts` (API repository) maps `canCancel` and `cancelReason` and posts to `paymentCancel`. `orderStatus.test.ts` checks that a seeded or fetched `cancelled` payment lands in `cancelled`. `OrderStatusHandler.test.tsx` checks the cancelled view renders its action.
**Done when:** `npx nx run ui:test` and `ui:lint` are green, and `npx nx run api:test` is still green (the Go model gained a zero-valued `CanCancel`).

### Phase 3: Back-navigation guard utility (`libs/ui/utils`)

**Depends on:** nothing.
**Deliver:** FR-10's `installBackNavigationGuard` (web + native no-op) and `useBackNavigationGuard`. Nothing imports it yet.
**Tests:** unit tests against the `next/router` stub: registering, swallowing a pop, re-entrancy, and dispose restores default handling.
**Done when:** `npx nx run ui:test` is green, and `libs/ui/.eslintrc.json`'s rules accept the `next` import under `utils/`.

### Phase 4: `CancelPayment` + endpoint + flag (API)

**Depends on:** 1, 2.
**Deliver:** FR-3 and FR-4. `ORDER_PAYMENT_CANCEL_ENABLED` defaults to off.
**Tests:** FR-3's list; FR-4's handler tests.
**Done when:** with the flag on locally, `curl -X POST /payments/{ref}/cancel` on a pending cash order returns `cancelled`, `GET /carts/current` shows the same items, `POST /carts/current/items` succeeds, and a new checkout returns a new reference. With the flag off, the endpoint returns 400.

### Phase 5: Late-payment supersede, cashier guard, locks (API)

**Depends on:** 1.
**Deliver:** FR-5.
**Tests:** FR-5's list, including the pre-existing `expired` → `paid_late` + newer pending case.
**Done when:** `npx nx run api:test` is green. This phase is also worth shipping for its `expired` fix alone.
**Watch for:** `FOR UPDATE` inside transactions that also call DOKU holds the row lock for the duration of an HTTP call (10 s client timeout). This is acceptable because the lock is a single payment row that nothing else contends for at volume. Say so in the PR.

### Phase 6: Cancel machine + status-page cancel flow (`libs/ui`) *(rescoped in v2)*

**Depends on:** 2.
**Deliver:** FR-8 (`PaymentCancelUsecase`, `usePaymentCancel` in `handlers/hooks/`) and FR-9 (except arming the back guard). `PaymentCancelAlert` + story. The status page is the machine's first consumer, so it doesn't land as dead code. Phase 14 adds the other two.
**Tests:** FR-8's and FR-9's lists.
**Done when:** Storybook shows every new variant, and the handler test drives button → confirm → `router.replace` against `MockPaymentRepository`. In production nothing changes, because `canCancel` is `false`.

### Phase 7: Back button opens the confirmation (`libs/ui`)

**Depends on:** 3, 6.
**Deliver:** `OrderStatusHandler` calls `useBackNavigationGuard(canCancel && awaiting, () => paymentCancel.dispatch({ type: 'REQUEST' }))`.
**Tests:** a handler test in which a simulated `beforePopState` callback opens the dialog while awaiting, and is not registered in `preparing`/`expired`/`cancelled`.
**Done when:** with the flag on locally, Back from a pending order on desktop Chrome opens the dialog and the URL stays on `/orders/{ref}`. After a confirmed cancel, Back from the cart does **not** land on the cancelled countdown.

### Phase 8: KDS `cash_cancelled` (API)

**Depends on:** 4 (and 5 for the supersede call site; if 5 hasn't merged, wire only `CancelPayment` and add the second call in whichever of the two lands last).
**Deliver:** FR-7.
**Tests:** message builder golden test. A cancelled cash order enqueues exactly one `cash_cancelled`, and none if no `cash_pending` exists. A QRIS cancel enqueues nothing.
**Done when:** a KDS device on staging receives the push after a cash cancel.

### Phase 9: Cancel the QR at DOKU (API, optional)

**Depends on:** 4.
**Deliver:** FR-6, **after** confirming `qr-mpm-cancel` for our merchant in the DOKU dashboard. If DOKU doesn't offer it, close the phase with a note in this PRD's Settled section and ship nothing.
**Tests:** `httptest` suite for the signed request, the success mapping, the "already paid" sentinel, and a transport error that is ignored.
**Done when:** on the DOKU sandbox, a cancelled QR can no longer be paid by the simulator.

### Phase 10: E2E, docs, enable

**Depends on:** 4, 5, 7, 12, 14 (plus 8 and 9 if in scope).
**Deliver:** FR-11. Flip `ORDER_PAYMENT_CANCEL_ENABLED=true` in production after the e2e suite passes locally (the e2e workflow runs post-merge only, so it must be run before merging), plus the manual device check: Android Chrome hardware back and iOS Safari swipe-back, for both methods.
**Done when:** all seven e2e scenarios pass, a real-device cancel → re-checkout with the other method works end to end, the close-tab → rescan → "Batalkan & tambah item" flow works on a real phone, and the docs-site page is live.

### Phase 11: The cart carries its lock (API + contract + `libs/ui` data) *(v2)*

**Depends on:** nothing.
**Deliver:** FR-13. `canCancel` is always `false` until phase 4 (or whichever of the two lands second) wires the flag.
**Tests:** FR-13's list.
**Done when:** with a pending payment on the local API, `GET /carts/current` returns `pendingPayment` with the right reference and `expiredAt`, and returns `null` once it expires, or once it is paid or cancelled. `npx nx run api:test` and `ui:test` are green.

### Phase 12: Pending QRIS in order history (API + `libs/ui`) *(v2)*

**Depends on:** nothing.
**Deliver:** FR-14. Update the one-line summary of History D14 in `docs/prd-order-history.md` to point at D19 here, so the older document doesn't mislead.
**Tests:** FR-14's list.
**Done when:** a pending QRIS order appears in `/orders` with "Menunggu pembayaran QRIS", opens its countdown, and disappears from the list within one sweeper tick of expiring. **Guest-visible on merge.**

### Phase 13: The locked cart is visible (`libs/ui`) *(v2)*

**Depends on:** 11.
**Deliver:** FR-15: the D23 refetch, `PendingPaymentBar` and `PendingPaymentNotice` (+ stories), and the `lockedNotice` props on `MenuItemDetailScreen`, `CartScreen` and `CartItemEditScreen` (+ stories), with "Lanjutkan pembayaran" only.
**Tests:** FR-15's list.
**Done when:** with a pending payment, the menu shows the bar, the item sheet shows the notice instead of the add button, the cart is read-only with the banner, and no cart write fails without a message. **Guest-visible on merge.** It needs no flag, because it only explains a lock that already exists and links to a page that already exists.

### Phase 14: Cancel from the menu and the cart (`libs/ui`) *(v2)*

**Depends on:** 6, 13.
**Deliver:** FR-16.
**Tests:** FR-16's list.
**Done when:** with the flag on locally, "Batalkan & tambah item" from the menu ends on a cart holding the old items plus the new one, and "Batalkan pembayaran" from the cart banner leaves an editable cart with Checkout back. With the flag off, neither cancel action renders.

---

## Risks

| Risk | Mitigation |
|---|---|
| A guest pays the saved QRIS PNG *after* cancelling | D4 closes the "already paid" race. D7 makes a late payment produce the right single order and retires any duplicate. Phase 9 closes the window at DOKU where supported. |
| A cashier pays a stale cancelled order | D8 (400) plus D16 (the KDS hears the cancel). |
| Deploy skew: the API emits `cancelled` before the order app understands it | Only a guest's own confirmed cancel produces `cancelled`, the button appears only on `canCancel`, and that stays `false` until phase 10 flips the flag, by which time phase 2 has long been deployed to Vercel. The same holds for `superseded`, which needs a cancel to exist first. |
| The back guard misbehaves on iOS Safari's swipe-back (the gesture animates to the previous page before `popstate`) | Phase 10's manual device check. If the swipe cannot be contained, the fallback is now good (v2): the guest reaches the cart, the banner says a payment is waiting, and it offers "Lanjutkan" or "Batalkan" right there (D21). Record the outcome in Settled in review. |
| *(v2)* A guest reads the bar or notice as an error and abandons | Copy is phrased as a state ("Menunggu pembayaran"), not a failure, and always carries a forward action. Success criterion 5 measures resumes and cancels from these surfaces. |
| *(v2)* The bar's countdown and the server disagree (phone clock skew) | The bar never unlocks on its own clock. Reaching zero triggers a cart refetch, and the server decides (same stance as QRIS D12a). At worst the bar shows 00:00 for one request. |
| *(v2)* D23's refetch-on-error hides a genuine failure behind a successful refetch | `errorMessage` is kept and rendered whenever the refetched cart isn't locked, so a non-lock failure still says "Gagal memperbarui keranjang". |
| `CartHandler` re-mounting with a stale `checkout` in `created` would bounce the guest back to the cancelled order (`CartHandler.tsx:83-87`) | `router.replace` remounts the page, so the use case is newly constructed at `idle`. Phase 7's "Back from cart" check and phase 10's e2e scenario 1 assert it. |
| Abuse: rapid checkout/cancel loops mint DOKU QRs and burn daily transaction numbers | Transaction-number gaps already occur on every expiry (Cash D4 accepted this). DOKU QR minting has no per-QR fee on our plan *(to confirm, open question 4)*. Rate limiting is out of scope until observed; the `cancel_reason = 'guest'` count per session makes it observable. |
| Row lock held across a DOKU call (D6) | A single payment row, one guest. Documented in phase 5. |

## Out of Scope

- Staff cancelling a guest's pending payment from the POS. Deleting the unpaid transaction there today leaves its payment `pending` until the sweeper runs. That is worth a follow-up that routes POS delete through `finalizeUncollectedPayment`, but it is a staff-side change.
- Cancelling or refunding a paid order.
- A cart-page toast after cancelling. (The *pending-payment* banner is in scope since v2. What's out of scope is a "you cancelled" confirmation.)
- Several concurrent unpaid orders per guest (Alternatives §4 Option B).
- Rate limiting checkout/cancel.

## Open Questions

1. **Should cancel be refused in the last few seconds of a QRIS countdown?** Proposed: no. D4's DOKU query already protects a guest who paid, and refusing would leave the guest staring at a timer they want to escape.
2. **After cancelling, should the checkout sheet preselect the method the guest *didn't* use?** Proposed: no for v1. It is cheap to add later in `CheckoutUsecase`'s params, and guessing wrong is worse than a neutral default.
3. **Is a visible "Pembayaran dibatalkan" confirmation needed on the cart?** Proposed: no. The editable cart is the confirmation, and the order app has no toast surface to reuse.
4. **Does DOKU charge per generated QR, and does our merchant account expose `qr-mpm-cancel`?** Both are needed to size phase 9 and the abuse risk.

## Rollout Notes

1. Phases 1–9 and 11–14 merge and deploy in any dependency-respecting order with the flag off. Guests see no cancel anywhere. Phase 5 changes behaviour only on the (pre-existing) expired-late-payment race. **Phases 12 and 13 are guest-visible on merge**, deliberately: pending QRIS in history, and a locked cart that explains itself and links back to its payment. Both help today, cancel or not.
2. Run `make migrate-up` on the API host before deploying the phase 1 binary.
3. Phase 10: run the e2e suite locally, do the device check, set `ORDER_PAYMENT_CANCEL_ENABLED=true` in the API's systemd `EnvironmentFile`, and restart. Kill switch: set it back to `false`. Payments already `cancelled` stay cancelled and correct.

## Success Criteria

1. **Method-switch completion:** of `cancel_reason = 'guest'` payments, the share whose cart reaches a `paid` payment within 15 minutes. Target ≥ 60% in the first month. Below that suggests guests are cancelling to leave, not to switch, which is worth a UX look.
2. **Zero double settlement:** `SELECT cart_id FROM payments WHERE status = 'paid' GROUP BY cart_id HAVING COUNT(*) > 1` returns no rows created after phase 5.
3. **No false cancels:** no `cancelled` payment later receives a DOKU paid notification without a `superseded` or `paid_late` log line. Monitor the `warn` logs from D4 and D7.
4. **Cashier guard exercised, not tripped over:** the rate of the D8 `400` is watched. A steady non-zero rate means staff are acting on a stale list and phase 8's KDS push needs to be more prominent.
5. *(v2)* **Locked carts get resolved, not abandoned:** of payments that were pending while the guest loaded the menu or cart (logged when `pendingPayment` is served), the share that end `paid` or guest-`cancelled` rather than `expired`. Measured before and after phase 13. It should rise.
6. *(v2)* **No silent cart failures:** zero cart-write errors not followed by a refetch. Asserted by phase 13's tests, since there is no runtime signal for "nothing happened".

## Settled in review

1. **v2: the lock stays, and becomes visible** (review on [gatherloop/gatherloop-pos#598](https://github.com/gatherloop/gatherloop-pos/pull/598)). The reviewer asked what happens when a guest closes the tab on the countdown: the cart would be locked with no visible way back, since pending QRIS isn't in history. They proposed clearing the cart at checkout and dropping the lock. Agreed instead: keep the lock (one cart = one order, items never leave), and add D18–D23. The proposal is recorded as Alternatives §4 Option B.
2. **v2: adding from the menu while locked** (same review). Asked: "what happens if the guest opens an item and adds it to the cart?" Answer: the sheet explains the pending payment instead of failing, and offers "Lanjutkan pembayaran" or "Batalkan & tambah item" (D21, D22). The pre-existing silent failure is fixed by D23.
3. **Phase 9: `qr-mpm-cancel` confirmed, under a different name.** DOKU's own integration guide (`developers.doku.com/accept-payments/direct-api/snap/integration-guide/qris#id-6.-cancel-qris`) documents "Cancel QRIS (QR Expire)" as part of the standard QRIS SNAP integration — not a separately gated merchant feature the Back Office has to enable, unlike refunds (Alternatives §2's open question). The operation is `qr-expire` (`POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate`'s sibling, request: `partnerReferenceNo`, `referenceNo`, `merchantId`, optional `reason`; response: `responseCode`, `responseMessage`, `partnerReferenceNo`, `referenceNo`, `expiredDate`), not `qr-mpm-cancel` as D5/FR-6 assumed before confirmation. It ships as `PaymentGatewayRepository.CancelQris`, called best-effort from `CancelPayment` right after `QueryQris` confirms the payment isn't already paid. The documented response carries no distinct "already paid" code, so — unlike QueryQris's D4 handling — every `CancelQris` failure (rejected response or transport error) is logged at `warn` and ignored; D5's "best-effort, nothing depends on it" already covers that case, since a stale QR that later gets paid is D7's supersede path, not this endpoint's problem.
3. **v2: the cancel dialog moved out of `OrderStatusUsecase`** into `PaymentCancelUsecase` (D20, superseding D12), because three screens now use it.
