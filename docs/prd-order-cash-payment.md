# PRD: Order App — Cash Payment at the Cashier

**Status:** Draft for review — all open questions resolved (see [Resolved Questions](#resolved-questions))
**Scope:** a second payment method for the order app's checkout — **cash, paid to the cashier** — alongside the QRIS flow shipped by `docs/prd-order-checkout-qris-doku.md`.
**Extends, does not supersede:** `docs/prd-order-checkout-qris-doku.md` (D-numbers there are cited as *QRIS D<n>*), `docs/prd-kds-order-notifications.md` (*KDS D<n>*), `docs/prd-order-fulfillment-status.md`, `docs/prd-order-history.md`.

---

## Problem Statement

A guest at a table can today scan the QR, build a cart, and pay — but only one way. `PaymentUsecase.Checkout` (`apps/api/domain/payment_usecase.go:66`) hard-codes `Method: PaymentMethodQris` and unconditionally calls `PaymentGatewayRepository.GenerateQris`; `domain.PaymentMethod` (`apps/api/domain/payment_entity.go:43`) has exactly one value; the checkout request in `libs/api-contract/src/api.yaml` (`PaymentCheckoutRequest`) carries a `customerName` and nothing else; and the guest-facing sheet that collects it (`libs/ui/src/presentation/views/components/checkout/CustomerNameSheet.tsx`) asks one question and then sends the guest straight to a QR.

A guest who cannot or will not pay by QRIS — no e-wallet balance, no mobile banking app installed, a bank app that will not open a saved QR image, or simply a preference for cash — has no path through the order app at all. They fall back to the pre-`prd-table-ordering.md` behaviour: walk to the counter and re-state an order the system already holds. For that guest the order app is a menu browser, not an ordering channel, and the counter bottleneck the whole feature exists to remove is fully intact.

The QRIS PRD anticipated this. Its Non-Goals say *"Any payment method other than QRIS … The gateway port is shaped so a second method is additive"*, and `payments.method VARCHAR(16) NOT NULL DEFAULT 'qris'` (migration `000025_create_payments.up.sql`) was created for exactly this moment — QRIS D5 records it as *"`method` exists so a second method is a value, not a migration"*.

### Root cause

Nothing is structurally wrong. The gap is that **every step after "create the transaction" assumes a gateway observes the payment**:

1. `PaymentUsecase.Checkout` calls the gateway inside the same DB transaction and rolls everything back if it fails (`payment_usecase.go:172`) — a method with no gateway has nothing to call.
2. A payment only ever leaves `pending` through `applyQrisStatus` (`payment_usecase.go:229`), reached from the DOKU webhook (`ConfirmPayment`) or from the guest's own polling (`refreshPendingPaymentStatus`, `payment_usecase.go:416`), and both paths begin with a DOKU query. A cash payment is observed by a human at a till, not by DOKU.
3. `TransactionUsecase.PayTransaction` (`transaction_usecase.go:209`) — the cashier's existing "mark as paid, choose a wallet" flow — pays the transaction but **never touches the `payments` row**. For a POS-keyed transaction there is none; for an order-app transaction there is, and it would be left `pending` forever.
4. The KDS outbox has one trigger: `payTransaction` → `EnqueueForTransaction` (`transaction_usecase.go:268`). Nothing notifies staff about an order that exists but is *not yet paid*, and `kds_notifications` carries `UNIQUE KEY uq_kds_notifications_transaction (transaction_id)` (migration `000032`), so a second notification for the same transaction is silently swallowed by design (KDS D4).
5. Nothing expires an abandoned payment on its own. A pending payment moves to `expired` **only** when someone reads it (`refreshPendingPaymentStatus`). A guest who closes the tab leaves an unpaid transaction and a frozen cart until the next read that never comes. QRIS gets away with this because its guest is staring at a countdown; a cash guest is walking downstairs.

6. **Wallet payment eligibility is only half-enforced.** `docs/prd-wallet-payment-eligibility.md` FR-2 says the payment modal shows only `is_payment_target = true` wallets; `TransactionCreateHandler.tsx:354` filters, `TransactionListHandler.tsx:313` does not, and `payTransaction` never checks. QRIS never notices, because it settles through the boot-validated `ORDER_PAYMENT_WALLET_ID`. Cash settles through nothing else, which promotes a latent defect into a live one.

So this PRD is five small, surgical changes to a design that was built to take them — plus one pre-existing fix (item 6) that cash would otherwise inherit. Not a new subsystem.

---

## How comparable products handle this

Self-ordering products that also take cash converge on the same shape:

- **The order is created and priced before payment**, with an identifier the guest carries to the counter. Fast-food kiosks print a ticket with a queue number; QR-ordering products show it on screen.
- **The counter is told the order exists**, because an unpaid order that only a guest knows about is an order that gets lost. Kiosks print to a counter printer; app-based systems buzz a device.
- **The unpaid order is garbage-collected**, on a window measured in the tens of minutes rather than the handful QRIS needs — the constraint is the walk and the queue, not a gateway's QR validity.
- **Payment is recorded at the till in the operator's normal payment UI**, not in a separate "confirm this app order" screen, so a cashier learns nothing new.

All four map onto machinery this repo already has: the daily transaction number (`allocateTransactionNumber`, `apps/api/data/mysql/transaction_repo.go:147`), the KDS outbox, the notification sweeper (`apps/api/main.go:254`), and `TransactionPaymentAlert` (`libs/ui/src/presentation/views/components/transactions/TransactionPaymentAlert.tsx`).

> **Verification note.** As with the DOKU section of the QRIS PRD, no vendor documentation was fetched while writing this — the paragraph above is stated from general familiarity with the category and is deliberately kept to patterns that are also independently justified by this repo's own code. Nothing in the design depends on it being an accurate description of any specific product, so no Sources section is offered rather than a fabricated one.

---

## Alternatives Considered

### 1. What a cash "payment" is in the data model

**Option A — a `payments` row with `method = 'cash'` and no gateway. (Recommended)**
- ✅ `payments.method` already exists and already defaults to `'qris'` — zero schema change for the method itself (QRIS D5).
- ✅ The guest's status page (`/orders/{reference}`), the order history list, the cart freeze and the "one live payment per cart" idempotency rule (QRIS D11) all key off a `payments` row and keep working unchanged.
- ✅ Reconciliation reads the same table for both channels: "what did the order app take today, and how".
- ❌ Stretches the table's stated meaning — QRIS FR-5 says *"it records a gateway payment attempt … a cashier taking cash on the POS still produces nothing here"*. A cash order-app payment is now a row without a gateway.
- The stretch is worth naming but not avoiding: the sentence was written to explain why *POS* cash is absent, and an order-app cash payment is a guest-initiated payment attempt against a cart, which is what the table is for.

**Option B — a new `cash_payments` table.**
- ✅ Leaves `payments` purely gateway-shaped.
- ❌ Every consumer doubles: the status endpoint, the freeze check, the history list, the expiry sweeper and the idempotency rule each need a second lookup and a union.
- ❌ Two tables that must never both hold a live row for one cart is a new invariant with no enforcement.

**Option C — no payment record; the unpaid `Transaction` is the whole state.**
- ✅ The smallest possible backend change.
- ❌ The guest's status page is reached by payment reference, scoped by `X-Session-Id` (QRIS D18). With no payment row there is no reference, so a guest who reloads loses their instructions entirely.
- ❌ Nothing freezes the cart, so a guest can add a drink after the amount they were told to pay was fixed.

### 2. The expiry window, and who enforces it

**Option A — reuse `DOKU_QRIS_EXPIRY_SECONDS` (300 s) and expire on read.**
- ✅ No new configuration, no new code path.
- ❌ 300 s is a *QR validity* window. The cash guest's clock includes standing up, walking to lantai 1, queueing behind the espresso machine and waiting for a barista to free up. Five minutes is optimistic on a quiet afternoon and wrong during a rush.
- ❌ Expiry-on-read means a guest who locks their phone is never expired at all — their cart stays frozen and their unpaid transaction stays in the POS list indefinitely.

**Option B — a separate `CASH_PAYMENT_EXPIRY_SECONDS` (600 s, resolved question 1), enforced by a server-side sweeper. (Recommended)**
- ✅ Answers the acceptance criterion's "can we do it?" with *yes* — and with machinery that already exists: `runNotificationSweeper` (`apps/api/main.go:254`) is already a ticker that drives two outboxes on `KDS_DISPATCH_INTERVAL_SECONDS` (default 15 s).
- ✅ Expiry stops depending on a client being awake, which also fixes the abandoned-QRIS case the current design leaks.
- ✅ One env var per method means the operator can tune the walk-and-queue window without touching DOKU's QR validity.
- ❌ One more background job and one more env var.

**Option C — no automatic expiry; a barista cancels an unpaid cash order by hand.**
- ✅ Never deletes an order a guest is about to pay for.
- ❌ Makes cleanup a staff chore, and the thing that needs cleaning (a frozen cart) is invisible to staff.
- ❌ The POS list fills with unpaid order rows nobody will ever pay, which is exactly what QRIS D5 introduced soft-deletion to prevent.

### 3. How the KDS hears about an unpaid cash order

**Option A — the existing outbox, with a `kind` column on `kds_notifications`. (Recommended)**
- ✅ Reuses the dispatcher, the retry ladder, the device fan-out (KDS D24), the sweeper backstop and the Expo gateway verbatim.
- ✅ Makes "one transaction, two notifications" expressible, which the current `UNIQUE (transaction_id)` forbids by construction.
- ❌ One migration and a signature change to `EnqueueForTransaction`, touching two existing call sites.

**Option B — a second table, `kds_cash_notifications`.**
- ✅ No change to an existing table or interface.
- ❌ A second dispatcher, a second sweeper job and a second retry ladder for a message that differs only in its title.

**Option C — no notification at checkout; the barista notices the guest at the counter.**
- ✅ Nothing to build.
- ❌ Fails the acceptance criteria outright, and the operational point of the notification is that the barista is *behind the bar* when the guest arrives at an unstaffed till.

---

## System Design Overview

### The path, end to end

```
 Guest (order app)                                     Cashier / barista
      │  taps Checkout on /t/{code}/cart
      ▼
  name sheet: name + payment method          (FR-8, one sheet, two radio options)
      │
      ├── "Bayar dengan QRIS"  ───────────────► unchanged QRIS flow (QRIS PRD)
      │
      └── "Bayar dengan Cash di Kasir"
              │  POST /carts/current/checkout { customerName, method: "cash" }
              ▼
        PaymentUsecase.Checkout            (FR-2 — one branch, no gateway call)
              │  inside BeginTransaction:
              ├─ upsert customers.name                            (unchanged)
              ├─ price the cart, CreateTransaction (unpaid, source='order')
              │     └─ allocateTransactionNumber → #12   ← the guest's identifier
              ├─ INSERT payments (method='cash', status='pending',
              │                   qr_content='', expired_at=now+CASH_EXPIRY)
              └─ EnqueueForTransaction(kind='cash_pending')        (FR-5)
              │
           COMMIT ──► TriggerDispatch (goroutine)
              │                                     │
              ▼                                     ▼
   redirect to /orders/{reference}          Expo push to every KDS phone
   "Bayar di kasir Lantai 1"                "Cash order #12 — Meja 4"
   #12 large · Rp 45.000 · countdown        "Collect Rp 45.000 at the counter"
              │                                     │
              │   guest walks down, shows #12       │  barista walks to the till
              │                                     ▼
              │                         POS → Transactions → #12 → Pay
              │                         (existing TransactionPaymentAlert,
              │                          wallet = Cash, paid amount, change)
              │                                     │
              │                                     ▼
              │                     TransactionUsecase.PayTransaction
              │                         ├─ payTransaction(): wallet, income,
              │                         │   paid_at, EnqueueForTransaction(
              │                         │        kind='order_paid')   ← already exists
              │                         └─ settleOrderPayment():             (FR-6)
              │                              payments.status='paid', paid_at,
              │                              carts.status='converted'
              │                                     │
              │                                  COMMIT ──► TriggerDispatch
              ▼                                     │
   next poll of GET /payments/{ref}                 ▼
   flips to "preparing"                  "New order #12 — Meja 4" on the KDS
                                          (unchanged KDS behaviour)

        ── and if nobody ever pays ──
   every KDS_DISPATCH_INTERVAL_SECONDS tick:                       (FR-4)
     PaymentUsecase.ExpireStalePayments
       pending && expired_at < now
         ├─ cash  → expire on the clock alone
         └─ qris  → confirm with QueryQris first (QRIS D12a)
       expire ⇒ payment='expired', availability released,
                transaction soft-deleted, cart unfrozen
```

The shape worth noticing: **the cashier's existing pay flow is the cash gateway.** `TransactionPaymentAlert` needs no change at all — the only new backend work on that path is teaching `PayTransaction` to settle the `payments` row it has always ignored (FR-6), which also closes a latent QRIS bug where a staff member paying an order transaction by hand left its payment row `pending` forever.

### Changed tables

One migration, `000035` (`000034_create_guest_notifications` is the latest):

```sql
-- 000035_add_kds_notification_kind.up.sql
ALTER TABLE kds_notifications
  ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'order_paid' AFTER transaction_id;

ALTER TABLE kds_notifications
  DROP INDEX uq_kds_notifications_transaction,
  ADD UNIQUE KEY uq_kds_notifications_transaction_kind (transaction_id, kind);
```

`DEFAULT 'order_paid'` backfills every existing row to what it already was, so the migration is non-breaking and the `.down.sql` reverses it exactly (drop the composite key, restore the single-column key, drop the column — safe because no transaction can yet hold two rows).

**No other schema change.** `payments.method` already exists with `DEFAULT 'qris'`; `payments.qr_content` is already nullable; `payments.expired_at`, `status`, `paid_at` and the `(cart_id, status)` index all carry cash unchanged.

### New and changed API surface

| Method | Path | Auth | Change |
| --- | --- | --- | --- |
| `POST` | `/carts/current/checkout` | `RequireSessionId` | Request gains `method: qris \| cash` (optional, defaults `qris` — the POS-style back-compat default QRIS D6 used for `source`) |
| `GET` | `/payments/{partnerReferenceNo}` | `RequireSessionId` | Response gains `method`; no DOKU re-query when `method = cash` |
| `GET` | `/payments` | `RequireSessionId` | Now also returns `pending` **cash** payments, so a guest who closed the tab can find their instructions again (D17) |
| `GET` | `/transactions` | `CheckAuth` | `Transaction` gains `paymentMethod: qris \| cash \| null`, resolved from the linked payment row (D16) |

Contract edits in `libs/api-contract/src/api.yaml`: `PaymentCheckoutRequest.method`, `Payment.method`, `PaymentSummary.method`, `Transaction.paymentMethod`. No new operation, no new path, no new tag. Both clients are regenerated (`npx nx run api-contract:generate:go` / `:generate:ts`).

### Changed backend files

| Layer | File | Change |
| --- | --- | --- |
| Entity | `domain/payment_entity.go` | `PaymentMethodCash`; `ParsePaymentMethod`; `Payment.RequiresGateway() bool` |
| Entity | `domain/kds_notification_entity.go` | `KdsNotificationKind` (`order_paid` \| `cash_pending`); `BuildKdsPushMessage` takes the kind and switches title/body (FR-7) |
| Use case | `domain/payment_usecase.go` | `Checkout` takes a method and branches at the gateway call (FR-2); `refreshPendingPaymentStatus` skips DOKU for cash (FR-3); `expirePayment` extracted from `applyQrisStatus`; new `ExpireStalePayments` (FR-4) |
| Use case | `domain/transaction_usecase.go` | `payTransaction` enqueues with an explicit kind, rejects an ineligible wallet (FR-13); `PayTransaction` calls `settleOrderPayment` and un-deletes per D23 (FR-6) |
| Repo iface | `domain/payment_repository.go` | `GetExpirablePayments(ctx, now, limit)` |
| Repo iface | `domain/kds_notification_repository.go` | `EnqueueForTransaction(ctx, transaction, kind)`; `KdsNotification.Kind` |
| MySQL | `data/mysql/payment_repo.go` | the expirable-payments query; `GetPaymentsBySessionId` includes pending cash (D17) |
| MySQL | `data/mysql/kds_notification_{repo,entity,transformer}.go` | `kind` column, conflict target `(transaction_id, kind)` |
| MySQL | `data/mysql/transaction_repo.go` | `payment_method` on the transaction read model (D16) |
| Mock | `data/mock/*_repository.go` | regenerated via `go generate ./...` — never hand-edited |
| REST | `presentation/restapi/payment_{handler,transformer}.go` | parse and validate `method`; serialise `method` |
| Wiring | `main.go`, `utils/env.go` | `CASH_PAYMENT_EXPIRY_SECONDS`; the expiry job added to the existing sweeper tick |

`data/doku/**` and `PaymentGatewayRepository` are **not touched**. That is the test of whether the port did its job.

### Changed frontend slice (`libs/ui`)

```
domain/entities/Payment.ts                  PaymentMethod = 'qris' | 'cash'; Payment.method; PaymentSummary.method
domain/entities/Transaction.ts              Transaction.paymentMethod
domain/repositories/payment.ts              checkout(customerName, method)
data/api/payment.ts (+ .transformer.ts)     pass and read method
data/mock/payment.ts                        a cash payment fixture (no qrContent)
domain/usecases/checkout.ts (+ .test.ts)    method in Context; CHANGE_METHOD action
domain/usecases/orderStatus.ts (+ .test.ts) awaitingCashPayment state; no countdown-driven poll for cash

presentation/views/components/checkout/
  CustomerNameSheet.tsx (+ .stories)        one field + a two-option method picker (D13)
  CashPaymentView.tsx   (+ .stories)        NEW — the instruction screen body
presentation/views/screens/order/
  OrderStatusScreen.tsx (+ .stories)        new `awaitingCashPayment` variant
presentation/views/components/transactions/
  TransactionListItem.tsx (+ .stories)      "Cash · awaiting payment" badge
  TransactionDetail.tsx  (+ .stories)       payment-method row
presentation/handlers/pos/
  TransactionListHandler.tsx (+ .test)      filter the pay modal by isPaymentTarget (FR-13, phase 0)
presentation/handlers/order/
  CartHandler.tsx (+ .test)                 method wired through the sheet
  OrderStatusHandler.tsx (+ .test)          the new variant
app/order/Cart.tsx, app/order/OrderStatus.tsx   flag + cashier-location props
```

`apps/order-web` gains two env vars and no new page — `/orders/{reference}` already exists and already renders by payment state.

### The KDS message

| Kind | Title | Body | When |
| --- | --- | --- | --- |
| `cash_pending` | `Cash order #12 — Meja 4` | `Collect Rp 45.000 at the counter · BAR: Kopi Susu x1, Latte x1` | at checkout, before any money moves |
| `order_paid` *(existing, unchanged)* | `New order #12 — Meja 4` | `BAR: Kopi Susu x1, Latte x1` | when the transaction is paid |

Same sound, same channel, same priority, same fan-out to every device (KDS D24). `data.kind` is added to the payload so a future KDS screen can style the two differently; today the app renders the OS notification and nothing reads it.

---

## Proposed Solution

### FR-1 — `method` crosses the contract (API)

- `PaymentCheckoutRequest` gains `method` (`enum: [qris, cash]`, **optional**, default `qris`). An absent field keeps every existing client byte-for-byte correct.
- `Payment` and `PaymentSummary` gain required `method`.
- `domain.PaymentMethodCash = "cash"`; `ParsePaymentMethod(string) (PaymentMethod, *Error)` rejects anything else with `400 bad_request` — the handler never trusts the string.
- `Payment.RequiresGateway()` returns `method == PaymentMethodQris`. Every "should I call DOKU?" branch added below asks this, not `method == cash`, so a third method later fails closed rather than silently skipping the gateway.

### FR-2 — The cash checkout branch (API)

`PaymentUsecase.Checkout(ctx, sessionId, customerName, method)`. Steps 1–6 of QRIS FR-6 are unchanged — wallet validation, name upsert, cart load, empty/no-table rejection, the live-payment idempotency check, pricing, availability reservation, `CreateTransaction`, reference minting. The branch is at the end:

| | `qris` | `cash` |
|---|---|---|
| `expired_at` | `now + DOKU_QRIS_EXPIRY_SECONDS` | `now + CASH_PAYMENT_EXPIRY_SECONDS` |
| gateway call | `GenerateQris`, rollback on failure | none |
| `qr_content` | DOKU's `qrContent` | `''` |
| `gateway_reference_no` | DOKU's reference | `''` |
| KDS enqueue | none | `kind = cash_pending` (FR-5) |

The idempotency rule (QRIS D11) is unchanged and **method-agnostic**: a cart with a live pending payment returns *that* payment whatever method the new request asks for. A guest who picks QRIS and then wants cash must let the payment expire — or, more practically, walk to the counter and show the same transaction number, which is a valid cash payment for the same order. (Method switching is Deferred; see below.)

`ORDER_PAYMENT_WALLET_ID` validation still runs for cash even though the wallet is irrelevant to it — one validation for one endpoint is cheaper to reason about than a conditional one, and a deployment with a broken wallet id should fail loudly on both methods.

### FR-3 — Status reads never call DOKU for cash (API)

`refreshPendingPaymentStatus` currently queries DOKU for any pending payment. It gains an early branch: when `!payment.RequiresGateway()`, the only question is the clock —

- `now < expired_at` ⇒ still `pending`, `status_checked_at` refreshed, nothing else;
- `now >= expired_at` ⇒ `expirePayment` (FR-4).

The 5 s re-query floor (`statusRequeryFloor`) is a DOKU-rate-limiting device and is skipped for cash.

This inverts QRIS D12a deliberately: for QRIS *the server's clock is not enough* because DOKU may already hold the money, so expiry needs a confirming query. For cash there is no third party — nothing can have been collected without a cashier having pressed Pay, which flips the payment through FR-6 first. The clock is the whole truth. D7 records this.

### FR-4 — The expiry sweeper (API)

New repository method:

```go
GetExpirablePayments(ctx context.Context, now time.Time, limit int) ([]Payment, *Error)
// status = 'pending' AND deleted_at IS NULL AND expired_at < now, oldest first, LIMIT limit
```

New use case method:

```go
func (usecase PaymentUsecase) ExpireStalePayments(ctx context.Context) *Error
```

Claims up to `paymentExpiryBatchSize` (50, matching `kdsDispatchBatchSize`) and processes each in its own `BeginTransaction`, so one bad row cannot poison the batch:

- **cash** — `expirePayment` directly.
- **qris** — `QueryQris` first; `paid` runs the full `applyQrisStatus` paid path (the late-payment un-delete of QRIS D5), anything else expires. A gateway error leaves the row alone for the next tick. This is QRIS D12a, now enforced for guests who closed the tab rather than only for guests who are watching.

`expirePayment(ctxWithTx, payment)` is extracted verbatim from the existing expired branch of `applyQrisStatus` (`payment_usecase.go:291`): payment → `expired`, availability released, transaction soft-deleted, cart thereby unfrozen. Both callers share it, so there is exactly one definition of what expiry does.

Wiring: `runNotificationSweeper` in `main.go:254` gains a third job and is renamed `runMaintenanceSweeper`. It keeps running on `KDS_DISPATCH_INTERVAL_SECONDS` (default 15 s) — a third env var for a job whose deadline is measured in minutes would be configuration nobody tunes, and 15 s of slack on a 10-minute window is noise. A `slog.Info` per expired payment carries the reference, the method and the transaction id.

### FR-5 — The cash-pending KDS notification (API)

`kds_notifications` gains `kind` (migration `000035`), `KdsNotification.Kind`, and `EnqueueForTransaction(ctx, transaction, kind)`. The GORM `OnConflict` clause in `data/mysql/kds_notification_repo.go` moves its conflict target to `(transaction_id, kind)`, preserving KDS D4's "duplicate enqueue is a no-op, never an error" for each kind independently.

Two rules change for the new kind:

1. **The station rule does not gate it.** `ShouldNotify` (`domain/kds_notification_routing.go:59`) asks whether any item routes to a station; `cash_pending` is enqueued regardless, because its purpose is *collecting money*, not preparing a drink (D9). A cash order of nothing but a board-game ticket still needs someone at the till.
2. **The business-day staleness rule (KDS D22) does not apply.** A `cash_pending` row is written at the instant the transaction is created, so `IsStaleForNotification` can never be true; asking is dead code, and the check stays on the `order_paid` path where it means something.

`Checkout` triggers a dispatch after its commit, exactly as `PayTransaction` and `ConfirmPayment` already do — the guest's HTTP response never waits on Expo.

### FR-6 — Paying an order transaction settles its payment (API)

`TransactionUsecase.PayTransaction`, inside its existing `BeginTransaction`, after `payTransaction` succeeds:

```
settleOrderPayment(ctxWithTx, transactionId):
  payment, err := paymentRepository.GetPaymentByTransactionId(...)
  NotFound        ⇒ nil                      (a POS-keyed transaction has no payment)
  status = paid   ⇒ nil                      (idempotent; the webhook may have won the race)
  otherwise       ⇒ payment.status = 'paid', paid_at = now
                    cart.status   = 'converted'
```

`GetPaymentByTransactionId` already exists and is already used this way in `CompleteTransaction` (`transaction_usecase.go:340`), NotFound included.

**And it un-deletes a transaction the sweeper got to first (D23).** `GetTransactionById` does not filter `deleted_at` (`data/mysql/transaction_repo.go:114`) while `GetTransactionList` does (`:21`), so today a cashier whose list was fetched a moment before expiry can press Pay and silently pay a soft-deleted transaction — it is banked, the wallet is credited, and it is invisible in every list. `PayTransaction` therefore checks `transaction.DeletedAt != nil` first and, for an `order`-source transaction, restores it before paying: `UndeleteTransactionById`, `availabilityReservation.ForceReserve`, and a `warn` log carrying the reference. This is `applyQrisStatus`'s existing late-payment path (`payment_usecase.go:253`) reused verbatim — the same situation, reached through a cashier instead of a webhook.

This is what makes the whole cash flow close: the guest's status page (which polls `GET /payments/{reference}` every 3 s while awaiting payment) flips to `preparing` within one poll of the cashier pressing Submit, the guest's web-push opt-in card appears, the cart converts so a "Pesan lagi" starts empty, and the sweeper can no longer expire a payment that has been collected.

It also fixes the same latent hole on the QRIS path, where a staff member paying an order transaction by hand (a guest who paid at the counter after their QR expired, say) left a `pending` payment row and an unconverted cart behind.

**A payment whose amount differs from the transaction total is still settled**, because the transaction — not the payment row — is the money record on this path, and the cashier may legitimately have taken a different paid amount with change (`TransactionPaymentAlert` computes it). The payment row's `amount` stays as quoted; the difference is visible in the transaction. Contrast the gateway path, where an amount mismatch is a hard stop (QRIS FR-6) — there, nobody human saw the money.

### FR-7 — The message the KDS shows

`BuildKdsPushMessage(transaction Transaction, kind KdsNotificationKind, sound string) KdsPushMessage` — pure, still re-derived at send time. `kdsOrderSubject` (table label for order transactions, customer name otherwise) is unchanged and shared.

```go
// cash_pending
Title: "Cash order #12 — Meja 4"
Body:  "Collect Rp 45.000 at the counter · BAR: Kopi Susu x1, Latte x1"
// order_paid (unchanged)
Title: "New order #12 — Meja 4"
Body:  "BAR: Kopi Susu x1, Latte x1"
```

The amount uses the same `formatRupiah`-equivalent Go formatting the order slip uses. `data` gains `"kind"`. Station lines are unchanged and still truncated at four items with `+N more`. A `cash_pending` notification for a transaction with **no** station items renders the body as the amount line alone.

### FR-8 — The checkout sheet asks for a method (frontend)

`CustomerNameSheet` keeps its single name field and gains a payment-method picker below it — two mutually exclusive options, rendered as large tappable rows (44 px minimum, matching the existing buttons):

- **Bayar dengan QRIS** — *"Scan atau simpan QR, bayar dari aplikasi bank atau e-wallet"*
- **Bayar dengan Cash di Kasir** — *"Bayar tunai di kasir {cashierLocation}"*

The primary button's label follows the selection: "Lanjutkan ke pembayaran" for QRIS, "Pesan & bayar di kasir" for cash. `Batal` is unchanged.

The method is **use-case state, not component state** — `CheckoutUsecase`'s `Context` gains `method: PaymentMethod` (default `'qris'`), with a `CHANGE_METHOD` action valid in `askingName`, and `SUBMIT_NAME` carries it into `creatingPayment`. It is submitted, echoed back and gates the redirect, exactly the reasoning QRIS FR-8 used for the name.

When the cash flag is off, the picker is not rendered and the sheet is byte-for-byte today's.

### FR-9 — The cash instruction screen (frontend)

`OrderStatusScreen` gains an `awaitingCashPayment` variant rendering a new `CashPaymentView`, on the existing `/orders/{reference}` route (D14):

- **"Bayar di kasir {cashierLocation}"** as the heading;
- the **transaction number**, rendered as large as the QR it replaces — this is what the guest shows (D4);
- the amount via `formatRupiah()`, and the table label in the header as today;
- the payment reference in small type underneath, as the fallback identifier;
- the line items and total;
- a countdown — *"Selesaikan pembayaran dalam 12:43"* — and the copy *"Tunjukkan nomor pesanan ini ke kasir. Pesanan akan dibatalkan otomatis jika belum dibayar."*;
- a quiet *"Menunggu pembayaran di kasir…"* with the same activity indicator the QRIS view uses.

`OrderStatusUsecase` polls at the existing 3 s `awaitingPayment` cadence — the guest wants the screen to flip the moment the cashier presses Submit, and the request never leaves our API for cash. `COUNTDOWN_ELAPSED` keeps its QRIS D12a meaning (one final poll, never a client-declared expiry); for cash the final poll is what surfaces the sweeper's verdict.

On expiry the existing `expired` variant is reused, with cash-specific copy: *"Waktu pembayaran habis"* / *"Pesanan dibatalkan karena belum dibayar. Keranjang Anda masih tersimpan."*

### FR-10 — The POS can see what it is waiting for (frontend)

- `Transaction.paymentMethod` (`qris | cash | null`) on the read model (D16).
- `TransactionListItem` renders a **"Cash · awaiting payment"** badge beside the existing `OrderBadge` when `source === 'order' && paymentMethod === 'cash' && !paidAt`, so a cashier scanning the list can tell an order waiting at the till from one that is mid-QRIS. Paid rows are visually unchanged.
- `TransactionDetail` gains a Payment Method row.
- No change to `TransactionPaymentAlert` or to the Pay menu item's `isShown: paidAt === undefined` gate — the cashier's flow is the flow they already run (D20). The one adjustment to wallet selection is phase 0's, and it is not a cash change: the modal starts honouring the eligibility flag it was always specified to honour (FR-13).

### FR-11 — Order history shows an unpaid cash order (frontend + API)

`GetPaymentsBySessionId` / `…Total` currently filter `status = 'paid'` (`data/mysql/payment_repo.go:54`). They widen to `status = 'paid' OR (status = 'pending' AND method = 'cash')`, and `OrderHistoryListItem` renders a **"Belum dibayar"** badge with the same countdown-free copy, routing to the instruction screen on tap.

Without this, a guest who closed the tab on their way downstairs has no route back to their own order number — the acceptance criterion's identifier would exist only in a browser history entry. Pending QRIS payments stay excluded: their QR is on a screen the guest is looking at, and a stale QRIS row in history is a dead link within five minutes.

### FR-12 — Copy and configuration

All guest copy is Bahasa Indonesia; all staff copy (POS, KDS) is English, matching the existing split. The cashier's location is **configuration, not a literal** — `tables.floor_number` already exists (migration `000021`), so "lantai 1" is a fact about this venue's till today, not a property of the software (D15).

| Variable | Where | Default | Notes |
|---|---|---|---|
| `CASH_PAYMENT_EXPIRY_SECONDS` | `apps/api/.env` | `600` | The walk-and-queue window (D5, resolved question 1) |
| `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED` | `apps/order-web/.env.local` | `false` | The kill switch (D18); `true` only in phase 14 |
| `NEXT_PUBLIC_ORDER_CASHIER_LOCATION` | `apps/order-web/.env.local` | `Lantai 1` | Rendered in the sheet and the instruction screen (D15) |

All three land in the matching `.env.example` with comments, and in `README.md`'s setup section beside the existing DOKU and KDS notes.

### FR-13 — Wallet eligibility holds on every pay surface (API + POS)

Not a cash requirement in itself — a pre-existing gap that cash is the first flow to depend on. `docs/prd-wallet-payment-eligibility.md` FR-2 says the transaction payment modal shows only `is_payment_target = true` wallets. Today (D24):

| Surface | State |
|---|---|
| `TransactionCreateHandler.tsx:354` — cashier keys a new sale | ✅ filters `isPaymentTarget` |
| `TransactionListHandler.tsx:313` — cashier pays an existing transaction | ❌ passes `transactionPay.state.wallets` straight through |
| `TransactionUsecase.PayTransaction` (`transaction_usecase.go:209`) | ❌ no check; `payTransaction` fetches the wallet by id and credits it |

The order-app cash flow settles **only** through the two unguarded rows, so an operator who marks `Brankas` ineligible still sees it offered to a barista collecting real cash, and the API would accept it.

1. `payTransaction` loads the wallet it is about to credit and returns `400 bad_request` — "wallet cannot receive transaction payments" — when `IsPaymentTarget` is false, before any balance is written. Both callers inherit it: the cashier's `PayTransaction` and the gateway's `applyQrisStatus`, where it is unreachable because `ORDER_PAYMENT_WALLET_ID` is already validated at boot (QRIS D15) — a second guard on a path that cannot fail it costs nothing and removes the need to reason about which callers are safe.
2. `TransactionListHandler` filters its `payWalletSelectOptions` exactly as `TransactionCreateHandler` does. The filter is the affordance; the use case is the rule.
3. **No `UnpayTransaction` guard.** Unpay reverses a credit to a wallet that was eligible when the payment was taken; refusing to reverse it because the wallet was opted out since would strand money in a wallet nobody can correct.

The one behaviour change an operator can notice: a transaction previously payable into an opted-out wallet no longer is. That is the rule the flag was introduced to express, so it is a fix, not a regression — but it ships in its own PR (phase 0) rather than buried in a cash phase, so a surprised operator has one commit to point at.

---

## Design decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** | Cash is a `payments.method` value, not a new entity, table or repository. | The column exists, defaults correctly, and every consumer of a payment row (status endpoint, cart freeze, idempotency, history, sweeper) then covers cash for free. QRIS D5 wrote the column for this. **Rejected:** a `cash_payments` table — it doubles five consumers to avoid one honest widening of an existing table's meaning. |
| **D2** | `PaymentGatewayRepository` and `data/doku/**` are not touched. | The port exists so a second method is additive (QRIS D2). If adding cash required editing the DOKU client, the abstraction would have failed. The branch lives in `PaymentUsecase.Checkout`, one level above the port, and asks `Payment.RequiresGateway()` rather than `method == cash` so a third method fails closed. |
| **D3** | The transaction is still created **unpaid at checkout**, before any money moves — identical to QRIS D4. | `transaction_items` is the price snapshot, and the cashier needs a transaction to find and pay. Creating it later would mean re-pricing a cart at the till, which is how a guest gets charged a different amount than the screen quoted. **Accepted cost:** an abandoned cash checkout leaves an unpaid transaction; D6 disposes of it. |
| **D4** | The guest's identifier at the till is the **daily transaction number** (`#12`), with the `ORD…` payment reference as a secondary line. | It already exists and is allocated at creation (`allocateTransactionNumber`), it is already what the POS list searches (`name LIKE ? OR transaction_number = ?`, `transaction_repo.go:108`), it is already what the KDS message and the order slip print, and it is four characters a guest can read aloud across a noisy counter. The `ORD` reference is 16 characters of base32 — correct for a URL, hostile as speech. **Note:** this is the *transaction* number, not the pager number, which stays `0` for order-app transactions (QRIS D16). |
| **D5** | Cash gets its **own expiry window**, `CASH_PAYMENT_EXPIRY_SECONDS`, set to **600 s (10 minutes)** — not the 300 s of `DOKU_QRIS_EXPIRY_SECONDS`. | The acceptance criteria propose 5 minutes "like QRIS", but the two windows measure different things: DOKU's is a QR's validity, cash's is a walk downstairs plus a queue. Five minutes fails on any busy afternoon, and the failure mode is the worst available — cancelling an order for a guest standing at the till holding money. An earlier draft of this decision argued 900 s; **600 s is the settled value (resolved question 1)** — twice the QRIS window, which is the part that matters, and a third less time than 900 s for a stale order to sit on the POS list and hold a cart frozen. Expiry stays cheap to get wrong in the guest's favour (the cart is preserved, re-ordering is one tap), and D23 catches the late cashier. |
| **D6** | Expiry is enforced by a **server-side sweeper**, not by the client's countdown and not by the read path alone. | Answers the acceptance criteria's "can we do it?": yes. Today a payment only expires when someone reads it, so a guest who locks their phone leaves a frozen cart and a POS row forever — a bug cash would make routine and QRIS already has. One job on the existing 15 s ticker (`main.go:254`) fixes both. **Rejected:** a `mysql` event or a cron entry — the API host already owns a sweeper, and a second scheduler is a second thing to deploy and monitor. |
| **D7** | For cash, **the server clock alone decides expiry**; for QRIS the sweeper still confirms with `QueryQris` first. | QRIS D12a exists because DOKU may hold money we do not know about. Cash has no third party: money cannot have been collected without a cashier pressing Pay, and that path (FR-6) settles the payment before any sweeper sees it. Adding a confirmation step for cash would mean asking DOKU about a payment DOKU has never heard of. |
| **D8** | The KDS learns through the **existing outbox**, with a `kind` column and a `(transaction_id, kind)` unique key. | Reuses the dispatcher, retry ladder, device fan-out (KDS D24), sweeper backstop and Expo gateway unchanged. The single-column unique key is precisely what forbids two notifications per transaction today, so widening it *is* the feature. `DEFAULT 'order_paid'` makes the migration non-breaking. **Rejected:** a second table and a second dispatcher for a message that differs in its title. |
| **D9** | The `cash_pending` notification **bypasses the station rule** (`ShouldNotify`). | The station rule answers "does anyone need to make something?" — the right question for `order_paid`, the wrong one for "someone is walking to an unstaffed till with cash". An order of nothing but a board-game ticket still needs collecting. KDS D22's business-day skip is also inapplicable, since the row is written the instant the transaction is created. |
| **D10** | A cash order buzzes the KDS **twice** — once at checkout, once when paid. | Both are load-bearing and neither is redundant: the first moves a barista to the till, the second is the existing signal to start making drinks, and between them a guest may never arrive. Titles differ ("Cash order" vs "New order") so a glance distinguishes them. **Accepted cost:** cash orders double the notification volume of the channel KDS Risks already flags for fatigue. Metric 4 measures it. |
| **D11** | `TransactionUsecase.PayTransaction` settles the linked `payments` row and converts its cart. | Without it the guest's screen never leaves "waiting", the cart never converts, and the sweeper would later expire and soft-delete a transaction the cashier has already banked. It also closes the same hole on the QRIS path for a hand-paid order transaction. NotFound is tolerated exactly as `CompleteTransaction` already tolerates it. |
| **D12** | The cart stays **frozen** while a cash payment is pending — no change required. | `ensureCartUnlocked` (`cart_usecase.go:221`) keys off `IsAwaitingPayment`, which is method-agnostic. The reasoning of QRIS D10 holds harder for cash: a guest who adds a drink while walking downstairs arrives with a quoted amount that no longer matches their order. The freeze releases on expiry without any sweeper involvement, because the check compares against `expired_at`. |
| **D13** | The method picker lives **inside the existing name sheet**, not on a new screen or a new route. | The acceptance criteria describe exactly one modal — name plus method. A separate method screen adds a tap to every order, including the QRIS majority, to serve a choice that is two radio rows. |
| **D14** | The cash instruction page is a **variant of `/orders/{reference}`**, not a new route. | The guest's order is already identified by one URL that renders by payment state (awaiting → preparing → ready), reachable by reload, by history, and by the back button. A `/cash-instructions` route would be a second URL for the same order with its own not-found and foreign-session handling. |
| **D15** | The cashier's location is configuration (`NEXT_PUBLIC_ORDER_CASHIER_LOCATION`, default `Lantai 1`), not a string literal and **not derived per table** (resolved question 2). | There is one till and it is on lantai 1, confirmed — so the value is a constant in practice, and deriving it from `tables.floor_number` would be machinery for a second till nobody has planned. It stays a variable rather than a literal only because a hard-coded "Lantai 1" is a release the day the till moves; a config default is the cheapest way to hold a fact that is true today and might not be. |
| **D16** | The POS reads the payment method from a **new `Transaction.paymentMethod` field**, not by inferring it. | "Unpaid and `source = order`" is true of a mid-QRIS transaction too, and a badge that lies to a cashier about whether someone is walking towards them is worse than no badge. The join to `payments` already exists in shape (`GetPaymentByTransactionId`); this exposes it on the list read model. |
| **D17** | Order history includes **pending cash** payments, and continues to exclude pending QRIS. | A guest who closed the tab has no other route back to their order number. A pending QRIS row would be a link that dies within five minutes to a QR that cannot be re-displayed usefully. |
| **D18** | One kill switch, `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED`, default `false` until the last phase. | Mirrors `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` (QRIS D20) exactly: every phase merges and deploys with no guest able to reach a half-built method. The API accepts `method: cash` from earlier phases, which is harmless — nothing sends it. |
| **D19** | `UnpayTransaction` leaves the payment row `paid`. | Unpay exists to correct a cashier's mistake within 24 h and rewinds the *transaction's* money (wallet, income). Rewinding the payment row too would flip a guest's screen back to "pay at the cashier" for an order that is already being made. The transaction is the money record; the payment row records that a payment attempt was collected. **Accepted mismatch**, named here so nobody discovers it in a reconciliation query and treats it as a bug. |
| **D20** | No *specific* wallet is enforced for cash — the cashier picks one in the existing alert, from the wallets an operator has marked payment-eligible. **Phase 0 makes that eligibility rule actually hold.** | The acceptance criteria say "choose wallet like current flow". `ORDER_PAYMENT_WALLET_ID` (QRIS D15) exists because *no human is present* on the DOKU path; a cashier at a till is present, and pinning them to one wallet would break the day cash is banked somewhere else. But "the cashier chooses" was never meant to mean *any* wallet: `docs/prd-wallet-payment-eligibility.md` FR-2 already says the payment modal shows only `is_payment_target = true` wallets. That rule is currently half-implemented (D24), and cash is the first flow whose entire settlement runs through the unguarded surface — so this PRD fixes it rather than building on it. |
| **D21** | A guest cannot cancel their own cash order in v1. | Expiry is the only exit, and it is visible as a countdown. A cancel button needs a rule for the race against a cashier who is mid-collection, which is real work for a case the 10-minute window already resolves. Deferred, not forgotten. |
| **D22** | `qr_content` is `''` for cash, and `Payment.qrContent` stays **required** in the contract. | Making it optional would be a breaking contract change for the QRIS client to express something the `method` field already says. The frontend switches on `method`, never on the emptiness of a string. |
| **D23** | Paying a **soft-deleted** order transaction from the POS un-deletes it and re-reserves its availability, rather than failing or paying it invisibly. | The cashier is standing in front of a guest holding money, which is exactly the situation QRIS D5 designed the un-delete path for — there for a late DOKU notification, here for a late cashier. Failing instead would force a re-key of an order the system already holds, seconds after it expired. Doing nothing (today's behaviour, since `GetTransactionById` ignores `deleted_at`) silently books revenue against a row no list will ever show. Logged at `warn` so the true frequency of the race is measurable rather than assumed — it is the leading indicator for the claim mechanism under Out of Scope. |
| **D24** | Wallet payment eligibility is enforced **in the use case**, not only in the payment modal — `PayTransaction` rejects a wallet with `is_payment_target = false`, and the list's modal filters like the create screen's already does. | `docs/prd-wallet-payment-eligibility.md` FR-2 is currently half-shipped: `TransactionCreateHandler.tsx:354` filters, `TransactionListHandler.tsx:313` does not, and `payTransaction` (`transaction_usecase.go:224`) never checks at all — it fetches the wallet by id and credits it. So an operator who opts `Brankas` out still sees it in the modal a barista uses, and any client that omits the filter can book revenue into it. Cash makes this load-bearing: QRIS settles through the validated `ORDER_PAYMENT_WALLET_ID` and never touches this surface, while **cash settles through nothing else**. A client-side filter alone would be the third place this rule is restated and the third place it can be forgotten; the use case is where it holds for every present and future pay surface. **Rejected:** fixing only the frontend filter — cheaper, and it leaves the server accepting a wallet the product says is ineligible. |

---

## Phased plan

Fifteen PRs: fourteen for cash, plus **phase 0**, which fixes a pre-existing gap cash would otherwise inherit (FR-13, D24). It is numbered 0 rather than 15 because it is not part of the cash feature and ships before or beside all of it — and because renumbering the other fourteen would break every cross-reference in this document.

Each is independently mergeable, leaves `main` green and the product shippable, and nothing is reachable by a guest before phase 14 because `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED` stays `false` (D18).

| # | Phase | Side | Touches | Depends on | Wave |
|---|---|---|---|---|---|
| 0 | Wallet eligibility enforced on every pay surface | API + `libs/ui` | `transaction_usecase.go`, `TransactionListHandler` | — | A |
| 1 | `method` crosses the contract | API | contract, entity, transformers | — | A |
| 2 | Cash checkout branch | API | `payment_usecase.go`, env | 1 | B |
| 3 | Status reads skip the gateway for cash | API | `payment_usecase.go` | 1 | B |
| 4 | The expiry sweeper | API | repo, use case, `main.go` | 1 | B |
| 5 | `kds_notifications.kind` | API | migration `000035`, repo, entity | — | A |
| 6 | Enqueue the cash-pending notification | API | `payment_usecase.go`, message builder | 2, 5 | C |
| 7 | Paying an order transaction settles its payment | API | `transaction_usecase.go` | — | A |
| 8 | `Transaction.paymentMethod` | API | contract, read model | 1 | B |
| 9 | Frontend payment slice | `libs/ui` | entities, repositories, `checkout.ts` | 1 | B |
| 10 | The checkout sheet asks for a method | `libs/ui` | `CustomerNameSheet`, `CartHandler` | 9 | C |
| 11 | The cash instruction screen | `libs/ui` | `CashPaymentView`, `orderStatus.ts`, handler | 9 | C |
| 12 | POS badge and detail row | `libs/ui` | `TransactionListItem`, `TransactionDetail` | 8 | C |
| 13 | Order history shows unpaid cash orders | API + `libs/ui` | `payment_repo.go`, `OrderHistoryListItem` | 1, 9 | C |
| 14 | Enable, verify, document | all | e2e, docs-site, `.env`, flag on | all | D |

### Dependency graph

A dependency here means **phase B does not compile, or has nothing to test, without phase A merged** — not "B reads better after A". Everything not connected by an arrow can be built at the same time by different people.

```
  wave A                wave B                 wave C            wave D

  0  wallet eligibility ──────────────────────────────────────►┐
     (pre-existing fix)                                        │
                                                               │
  5  kind column ─────────────────────────►  6  enqueue ───────┤
                                             ▲                 │
  1  method in ──┬────────►  2  cash ────────┘                 │
     the contract│            checkout                         │
                 │                                             │
                 ├────────►  3  cash status reads ────────────►┤
                 │                                             │
                 ├────────►  4  expiry sweeper ───────────────►┤
                 │                                             ├──►  14  enable
                 ├────────►  8  Transaction ──►  12  POS ─────►┤       verify
                 │              .paymentMethod     badge       │       document
                 │                                             │
                 └────────►  9  FE payment ─┬──► 10  sheet ───►┤
                                slice       ├──► 11  screen ──►┤
                                            └──► 13  history ─►┤
                                                (also needs 1) │
                                                               │
  7  settle payment row on POS pay ────────────────────────────┘
     (independent — also fixes a standing QRIS bug)
```

**Waves** — everything in a wave can run concurrently:

| Wave | Phases | Notes |
|---|---|---|
| **A** | **0, 1, 5, 7** | Four people can start on day one. 0, 5 and 7 never touch the cash path at all — 0 and 7 are standing bug fixes worth shipping on their own merits, and 5 is a pure refactor plus migration. |
| **B** | **2, 3, 4, 8, 9** | All unblocked by phase 1 alone. 9 opens the whole frontend track as soon as the TS client is regenerated. |
| **C** | **6, 10, 11, 12, 13** | The widest wave — five PRs, no arrows between any of them. |
| **D** | **14** | Needs every other phase merged, by definition. |

**Critical path: 1 → 2 → 6 → 14**, four phases deep. Nothing else is longer, so with three or more people the calendar length of the project is that chain plus however long phase 14's manual verification takes — the other ten phases fit inside it.

**File contention is the real constraint, not the graph.** Three pairs will conflict on merge even though neither side depends on the other:

- **2, 3, 4 and 6 all edit `apps/api/domain/payment_usecase.go`**, and 4 moves code out of the same function 3 edits (`expirePayment` extracted from `applyQrisStatus`). Give this file to **one owner to land in order 2 → 3 → 4**, or expect a rebase per PR. This is the single biggest reason wave B is not as parallel as the table makes it look.
- **1 and 8 both edit `libs/api-contract/src/api.yaml`** and both regenerate clients — different schemas, so the conflict is mechanical, but the regenerated output is not in git (`__generated__` is gitignored), so it resolves itself.
- **4 and 13 both edit `apps/api/data/mysql/payment_repo.go`** — different functions, trivial.

**If only one person is working**, the order 0 → 1 → 2 → 5 → 6 → 3 → 4 → 7 → 9 → 10 → 11 → 8 → 12 → 13 → 14 gets a demoable end-to-end cash flow soonest: after phase 6 the backend takes a cash order and buzzes the KDS, which is enough to show the operator before any UI exists.

### Phase 0 — Wallet eligibility enforced on every pay surface (API + `libs/ui`)

**Depends on:** nothing — wave A, and nothing in the cash feature depends on it either. It is sequenced first because it is a money-correctness fix that cash would otherwise inherit, and because it is the only phase here that changes existing POS behaviour, so it should land where an operator can see it alone.
**Deliver:** FR-13 — the `IsPaymentTarget` guard in `payTransaction` returning `400 bad_request`; the `isPaymentTarget` filter on `TransactionListHandler`'s `payWalletSelectOptions`, matching `TransactionCreateHandler.tsx:354`; a line in `docs/prd-wallet-payment-eligibility.md` recording that FR-2 is now enforced in the use case as well as the modal.
**Tests:** Go — paying into an `is_payment_target = false` wallet returns `400` and writes **no** balance, no income and no `kds_notifications` row; paying into an eligible wallet is unchanged; unpay into a since-opted-out wallet still succeeds (FR-13 item 3); the QRIS path is unaffected because its wallet is validated at boot. `libs/ui` — `TransactionListHandler.test.tsx` asserts an ineligible wallet is absent from the modal's options and an eligible one present.
**Done when:** a wallet with the flag off cannot be selected in either pay modal **and** cannot be credited by a direct API call, and `npx nx run api:test && npx nx run ui:test` are green.
**Watch for:** this is the one phase that can surprise an operator — if a venue has been paying into an opted-out wallet by habit, that stops working. Check the wallet list's `Can receive transaction payments` column against recent transactions' wallets before deploying.

### Phase 1 — `method` crosses the contract (API)

**Depends on:** nothing — wave A, start immediately.
**Deliver:** `PaymentCheckoutRequest.method` (optional, `qris` default), `Payment.method`, `PaymentSummary.method` in `api.yaml`; `domain.PaymentMethodCash`, `ParsePaymentMethod`, `Payment.RequiresGateway()`; the handler parses and validates the field; the restapi transformer serialises it; both clients regenerated. `Checkout` still ignores the parsed method and always mints QRIS; a `cash` request returns `400 "payment method is not available yet"`.
**Tests:** usecase tests for `ParsePaymentMethod` (each valid value, an unknown string, the empty default); handler tests for an absent `method` still creating a QRIS payment and for an unknown value returning `400`.
**Done when:** existing checkout behaviour is unchanged, `GET /payments/{ref}` reports `"method": "qris"` for every existing row, and `cash` is rejected with a named error rather than silently accepted.

### Phase 2 — Cash checkout branch (API)

**Depends on:** phase 1 (`RequiresGateway()` and the parsed method). Shares `payment_usecase.go` with phases 3, 4 and 6 — land it first of the four.
**Deliver:** FR-2 — `Checkout` takes the method and branches on `RequiresGateway()`; `CASH_PAYMENT_EXPIRY_SECONDS` in `utils/env.go` and `.env.example`; `NewPaymentUsecase` gains the field; phase 1's rejection removed.
**Tests:** a cash checkout creates an unpaid `order` transaction, a `pending` cash payment with empty `qr_content` and `expired_at = now + CASH_PAYMENT_EXPIRY_SECONDS`, and **never calls the mock gateway** (`EXPECT().GenerateQris().Times(0)`); a gateway failure still rolls a *QRIS* checkout back; an existing live payment is returned whatever method is asked for; empty cart and missing table still `400`.
**Done when:** a cash `POST /carts/current/checkout` returns a payment reference with no DOKU traffic, and the resulting transaction is visible and payable in the POS.

### Phase 3 — Status reads skip the gateway for cash (API)

**Depends on:** phase 1. Independent of phase 2 in code, but only verifiable end to end once 2 can mint a cash payment — until then its tests drive the mock repository directly.
**Deliver:** FR-3 — the `RequiresGateway()` branch in `refreshPendingPaymentStatus`, with clock-only expiry for cash and the 5 s re-query floor skipped.
**Tests:** a pending cash payment read before `expired_at` stays pending with no gateway call; read after `expired_at` expires, soft-deletes its transaction, releases its availability reservation and unfreezes its cart; a QRIS payment's behaviour is unchanged including D12a's confirming query.
**Done when:** the guest's status endpoint works end to end for cash with the DOKU client wired to a mock that fails every call.

### Phase 4 — The expiry sweeper (API)

**Depends on:** phase 1. Not blocked by 2 or 3, but it moves `expirePayment` out of the function phase 3 edits, so land it after 3.
**Deliver:** FR-4 — `GetExpirablePayments`, `expirePayment` extracted from `applyQrisStatus`, `ExpireStalePayments`, and the job added to the renamed `runMaintenanceSweeper` in `main.go`.
**Tests:** a batch containing a cash and a QRIS payment expires the cash one on the clock and the QRIS one only after a confirming query; a QRIS payment DOKU reports `paid` is paid, not expired (QRIS D5's late-payment path); a gateway error leaves the row for the next tick; a row already `paid` is never touched; the batch limit holds; one failing row does not abort the others.
**Done when:** with the API running and no client polling at all, an abandoned cash checkout disappears from the POS list and unfreezes its cart within one tick of its window closing.

### Phase 5 — `kds_notifications.kind` (API)

**Depends on:** nothing — wave A, and it touches no cash code at all.
**Deliver:** migration `000035` (add `kind`, swap the unique key), `KdsNotificationKind`, `KdsNotification.Kind`, `EnqueueForTransaction(ctx, transaction, kind)` with the conflict target moved, both existing call sites passing `KdsNotificationKindOrderPaid`, regenerated mocks. **No new trigger and no message change** — a pure refactor plus schema.
**Tests:** every existing KDS test passes with the new signature; a duplicate enqueue of the same `(transaction_id, kind)` is still a no-op; two rows for one transaction with different kinds both insert; the migration applies and rolls back cleanly against a table with existing rows.
**Done when:** `kds_notifications` holds `kind = 'order_paid'` for every pre-existing row and the KDS behaves identically.

### Phase 6 — Enqueue the cash-pending notification (API)

**Depends on:** phases 2 and 5 (a cash branch to enqueue from, and a `kind` to enqueue under).
**Deliver:** FR-5's enqueue inside `Checkout`'s cash branch plus the post-commit `TriggerDispatch`; FR-7's kind-aware `BuildKdsPushMessage`; `data.kind` in the payload.
**Tests:** a cash checkout writes one `cash_pending` row and a QRIS checkout writes none; the row is written even when no item routes to a station (D9); the built message carries the amount, the table label and the transaction number; `order_paid`'s title and body are byte-for-byte unchanged; a transaction with both kinds dispatches both.
**Done when:** a cash checkout against a registered device buzzes the KDS with "Cash order #N", and paying it buzzes again with "New order #N".

### Phase 7 — Paying an order transaction settles its payment (API)

**Depends on:** nothing — wave A. It is a standing bug fix on the existing QRIS path (D11, D23) and ships on its own merits whether or not cash is ever built.
**Deliver:** FR-6 — `settleOrderPayment` called from `PayTransaction` inside its existing DB transaction, plus D23's un-delete of a soft-deleted order transaction.
**Tests:** paying a cash order transaction flips its payment to `paid` with `paid_at` and converts its cart; paying a POS transaction with no payment row succeeds unchanged; a payment already `paid` is a no-op (the webhook-wins race); a paid amount above the total still settles and the transaction keeps the change math; paying a soft-deleted order transaction un-deletes it, re-reserves availability and settles its expired payment (D23); a soft-deleted **POS** transaction is untouched by that path; the sweeper leaves the now-paid payment alone on its next tick.
**Done when:** the cashier presses Submit and the guest's status endpoint reports `preparing` on its next read, with the cart converted.

### Phase 8 — `Transaction.paymentMethod` (API)

**Depends on:** phase 1, for the `qris | cash` enum the field reuses.
**Deliver:** D16 — `paymentMethod` on the `Transaction` schema, resolved from the linked payment in the MySQL read model and the restapi transformer; `null` for POS transactions; regenerated clients.
**Tests:** a POS transaction serialises `paymentMethod: null`; a cash order transaction reports `cash` before and after payment; a QRIS one reports `qris`; the transaction list query cost is unchanged in shape (one join, no N+1).
**Done when:** `GET /transactions` distinguishes the two order-app methods without any client change.

### Phase 9 — Frontend payment slice (`libs/ui`)

**Depends on:** phase 1, for the regenerated TS client. Opens the whole frontend track.
**Deliver:** `PaymentMethod` on the `Payment` and `PaymentSummary` entities (the `Transaction.paymentMethod` entity field belongs to phase 12, so the two frontend tracks share no file); `PaymentRepository.checkout(customerName, method)`; the API repository, transformers and mock repository (including a cash fixture with no `qrContent`); `CheckoutUsecase` gains `method` in `Context` and a `CHANGE_METHOD` action. **No UI.**
**Tests:** `checkout.test.ts` — the default method is `qris`; `CHANGE_METHOD` is accepted in `askingName` and ignored elsewhere; a cash submit calls the repository with `'cash'`; `CANCEL_NAME` resets nothing but the error; the error branch via `MockPaymentRepository.setShouldFail(true)`.
**Done when:** the machine is green headlessly, with no React and no network.

### Phase 10 — The checkout sheet asks for a method (`libs/ui`)

**Depends on:** phase 9. Parallel with 11, 12 and 13 — no shared files.
**Deliver:** FR-8 — the method picker in `CustomerNameSheet` with its own story per selection and per flag state; `CartHandler` passing `method`, `onMethodChange` and the flag through; `app/order/Cart.tsx` reading `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED` and `NEXT_PUBLIC_ORDER_CASHIER_LOCATION`.
**Tests:** `CartHandler.test.tsx` over mock repositories — the sheet opens prefilled with the remembered name and `qris` selected; selecting cash and submitting checks out with `'cash'` and redirects to `/orders/{reference}`; with the flag off no picker renders and the sheet is today's; a rejected name keeps the sheet open having created nothing.
**Done when:** with the flag on locally, choosing cash creates a cash payment and lands on the order page; with it off, the sheet is unchanged.

### Phase 11 — The cash instruction screen (`libs/ui`)

**Depends on:** phase 9. Parallel with 10, 12 and 13 — no shared files.
**Deliver:** FR-9 — `CashPaymentView` with stories, the `awaitingCashPayment` variant on `OrderStatusScreen`, the cash-specific `expired` copy, `orderStatus.ts`'s method-aware state mapping, `OrderStatusHandler`'s exhaustive mapping, and `app/order/OrderStatus.tsx` passing the cashier location.
**Tests:** `orderStatus.test.ts` — a pending cash payment enters `awaitingCashPayment` and polls at 3 s; a poll returning `paid` moves to `preparing`; a poll returning `expired` moves to `expired`; `COUNTDOWN_ELAPSED` issues one final poll and never expires on its own; a poll error keeps the state. `OrderStatusHandler.test.tsx` per variant; a story per state.
**Done when:** a cash checkout renders the transaction number, the amount, the cashier location and a live countdown, and flips to "sedang disiapkan" within one poll of a POS payment — verified on a real phone-width viewport, not only in Storybook.

### Phase 12 — POS badge and detail row (`libs/ui`)

**Depends on:** phase 8, for the generated `Transaction.paymentMethod` type. Not blocked by the order-app frontend track at all.
**Deliver:** FR-10 — `Transaction.paymentMethod` on the frontend entity and its transformer, the "Cash · awaiting payment" badge on `TransactionListItem`, the Payment Method row on `TransactionDetail`, stories for badge present and absent, mobile parity through the shared components.
**Tests:** handler-level assertion that a paid cash order renders no awaiting badge; stories for each state.
**Done when:** a cashier can tell, from the list alone, which order-app rows are someone walking towards them.

### Phase 13 — Order history shows unpaid cash orders (API + `libs/ui`)

**Depends on:** phases 1 and 9. Its API half is independent of every other backend phase; its `payment_repo.go` edit is a different function from phase 4's.
**Deliver:** FR-11 — the widened `GetPaymentsBySessionId` / `…Total` queries, the `method` field on `PaymentSummary` through to the entity, the "Belum dibayar" badge on `OrderHistoryListItem`, and its route to the instruction screen.
**Tests:** repo tests for the widened filter (paid QRIS in, paid cash in, pending cash in, pending QRIS out, expired out, other sessions out); a story for the badge; a handler test for the tap-through.
**Done when:** a guest who closes the tab mid-cash-order finds it again from `/orders` and recovers their number.

### Phase 14 — Enable, verify, document

**Depends on:** every other phase — this is the only one that cannot be parallelised with anything.
**Deliver:** an `apps/order-web-e2e` spec covering cart → cash checkout → instruction screen → (API-side payment) → preparing, and a second covering expiry; `CASH_PAYMENT_EXPIRY_SECONDS=600` set on the API host (resolved question 1); `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED=true` and `NEXT_PUBLIC_ORDER_CASHIER_LOCATION=Lantai 1` set on the order-web deployment (resolved question 2); a `docs-site/sales/order-checkout.md` update and a `docs-site/sales/kds.md` note about the second notification; `README.md`'s setup section pointed at the new variables and this PRD.
**Done when:** a real guest orders from a table, pays cash at the counter against their transaction number, the KDS buzzes twice, the POS shows the order paid to the Cash wallet, and an abandoned order disappears on its own within the configured window.

---

## Risks

| Risk | Mitigation |
|---|---|
| **An order is auto-cancelled while the guest is queueing at the till.** The worst failure in the feature: the cashier cannot find a transaction that has been soft-deleted, and the guest is standing there with money. | The 10-minute window (D5) is twice the QRIS one and set from the walk-and-queue reality, not from a QR's validity, and D23 pays the order anyway if the cashier is seconds late. The countdown is visible to the guest throughout. If it still happens, the cashier's recovery is the pre-existing one: key the order into the POS by hand from the guest's screen, which still shows the items. **A "cashier claims the order and stops the clock" mechanism is the first thing to build if this fires more than rarely** — it is Deferred, not rejected. |
| A cash order that is never paid still buzzed the KDS, pulling a barista to an empty till. | Unavoidable with a pre-payment notification, and cheap: a walk to the counter. Metric 3 measures the ratio; if it rises, the answer is a shorter window or a confirmation step before checkout, not a quieter notification. |
| Notification fatigue — cash doubles the pushes per order, on a channel KDS Risks already flags. | Distinct titles, the same sound, and Metric 4 tracks volume. Per-station or batched delivery remains the documented escalation (KDS Out of Scope). |
| The sweeper deletes a transaction the cashier is mid-payment on, between their opening the alert and pressing Submit. | **Today this silently pays a soft-deleted row** — `GetTransactionById` ignores `deleted_at` while the list filters it — so the money is banked against an invisible transaction. D23 turns that into an un-delete-and-pay, with a `warn` log whose frequency is the trigger for building the claim mechanism. |
| Guests pick cash by accident, then pay by QRIS anyway (or vice versa). | The two method rows carry explanatory subtitles, and picking wrong costs the expiry window, not money. Switching methods mid-payment is Deferred (D-note under FR-2); until then the cash path is a superset — a guest holding a QRIS reference can always pay it in cash at the till, because the cashier pays the *transaction*. |
| The payment row and the transaction disagree after an unpay (D19). | Named and accepted in D19. Reconciliation reads `transactions`, which QRIS FR-5 already establishes as the money record; `payments` records attempts. |
| `(transaction_id, kind)` migration on a live table. | `DEFAULT 'order_paid'` backfills correctly by construction, and no transaction can currently hold two rows, so the key swap cannot fail on existing data. The `.down.sql` is exact. Phase 5 ships alone, before anything writes a second kind. |
| Cash takings land in the wrong wallet because the cashier picked one from habit. | Narrowed by phase 0: the choice is now limited to wallets an operator marked payment-eligible, enforced in the use case rather than only in the modal (D24). Picking the wrong *eligible* wallet remains an operator-training matter, and `Transaction.paymentMethod` makes a mis-booked order-app payment findable after the fact. |
| Phase 0 stops a venue paying into a wallet they had been using. | The rule it enforces is the one `docs/prd-wallet-payment-eligibility.md` already states, so any wallet it blocks was already marked ineligible by an operator — but the flag defaults to `true` and may never have been audited. Phase 0's pre-deploy check is to compare recent transactions' wallets against the flag. Recovery is one wallet edit, not a rollback. |

---

## Out of scope

| Not doing | Why |
|---|---|
| Switching the payment method on a live payment | The idempotency rule (QRIS D11) returns the existing payment whatever is asked. Cancel-and-remint is a state transition with its own races; the 10-minute window makes waiting cheap, and paying an existing QRIS reference in cash at the till already works. |
| A guest-facing "cancel my order" button | D21. Expiry is the only exit in v1. |
| A "cashier claims this order" state that pauses the countdown | The correct answer to the top risk if it materialises, and real work (a claim, a claimant, a release, a timeout on the claim). Deferred deliberately, not overlooked. |
| Partial payment, split bills, tips, service charge | None exist anywhere in the POS. |
| A cash-specific wallet constraint | D20 — the cashier chooses among payment-eligible wallets, and phase 0 makes that set real. Pinning cash to one configured wallet the way DOKU is pinned is explicitly not wanted. |
| **Printing an order slip at the till for an unpaid cash order** | Resolved question 3: not wanted. `buildOrderSlipPayload` (`libs/ui/src/utils/print.ts`) could do it, but the KDS notification is the whole signal — the barista is holding the phone that just buzzed, and a slip for an order that may never be paid is paper and a bin. The existing print-on-paid behaviour is untouched. |
| **Deriving the cashier location per table from `tables.floor_number`** | Resolved question 2: there is one till and it is on lantai 1. A per-floor mapping would be a guess about a second till that does not exist. The configured string stays (D15) so a move is config, not a release. |
| POS-side acceptance of a cash payment from a screen other than the transaction list | The cashier's existing flow is the whole point; a dedicated "app orders awaiting cash" screen is a filter away (`source=order`, unpaid) if it is ever wanted. |
| Card / EDC as a third method | Additive through the same `method` column and the same `RequiresGateway()` branch, and out of scope here. |
| Changing the QRIS window or any DOKU behaviour | Untouched by this PRD except where the sweeper now also confirms abandoned QRIS payments, which is QRIS D12a applied to a case the current design misses. |

---

## Resolved questions

All three are answered; none blocks any phase.

1. **Cash window — 10 minutes** (`CASH_PAYMENT_EXPIRY_SECONDS=600`). Between the 300 s the acceptance criteria proposed and the 900 s D5 argued for. Twice the QRIS window, which is the part that matters — it is sized for the walk and the queue rather than for a QR's validity — while keeping a stale order off the POS list and out of the cart freeze for a third less time than 900 s would. **What makes 600 s safe is the same thing that made QRIS's 300 s safe:** expiry is cheap in the guest's favour (the cart survives, re-ordering is one tap) and D23 catches the cashier who arrives late, un-deleting the transaction rather than refusing the money. **One consequence accepted:** the D23 race fires more often at 600 s than it would have at 900 s, so its `warn` log is the metric to watch — Success criterion 3 exists for exactly this, and a nonzero rate is the trigger for the claim mechanism under Out of Scope, not for quietly raising the number.
2. **Cashier location — one configured string, always "Lantai 1".** D15 stands as written: `NEXT_PUBLIC_ORDER_CASHIER_LOCATION` with `Lantai 1` as its default. **Rejected:** deriving it per table from `tables.floor_number` — there is one till, it is on lantai 1, and a mapping built for a second till that does not exist would be a guess about where it will be. The variable stays rather than becoming a literal, because that is what makes the till moving a config change instead of a release.
3. **No order slip at the till for an unpaid cash order.** The KDS notification is the whole signal. Moved to Out of Scope — a printed slip for an order that may never be paid is paper and a bin, and the barista is holding the phone that just buzzed.

---

## Success criteria

1. **Cash share of order-app checkouts** — the number the feature exists to create. Any non-trivial share means guests existed who previously could not order at all.
2. **Cash completion rate** — cash payments reaching `paid` ÷ cash payments created. Below ~70% means the window, the instructions or the till staffing is wrong, in that order of likelihood.
3. **Expiry rate, and how much of it is late** — payments the sweeper expires, and how many of those were followed within the hour by a hand-keyed POS transaction for the same items. A nonzero second number is the top risk firing and triggers the claim mechanism.
4. **KDS notifications per paid order** — expected to rise from 1.0 towards 2.0 as cash share grows. Tracked so the fatigue conversation starts from a measurement (D10).
5. **Zero payment/transaction disagreements** — paid transactions whose `payments` row is still `pending`, which FR-6 should make impossible. Any occurrence is a P1.
