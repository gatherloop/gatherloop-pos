# PRD: Order App — Cash on Delivery (COD), Verified by a Photo

**Status:** Draft for review
**Scope:** a third order-app payment method — **Cash on Delivery (COD)**: the guest proves they are in the café with a live camera photo, a barista verifies it, the order is made *before* payment, and the guest pays at the counter when they pick it up. Shipped behind a trial feature flag, with the existing cash-at-the-cashier method hidden so the guest sees exactly two options: **QRIS** or **COD**.
**Extends, does not supersede:** `docs/prd-order-cash-payment.md` (cited as *Cash D<n>*), `docs/prd-order-checkout-qris-doku.md` (*QRIS D<n>*), `docs/prd-order-payment-cancellation.md` (*Cancel D<n>*), `docs/prd-order-fulfillment-status.md` (*Fulfil D<n>*), `docs/prd-kds-order-notifications.md` (*KDS D<n>*), `docs/prd-order-whatsapp-notifications.md` (*WA D<n>*).

---

## System Design Overview

Read this section first; everything after it is the argument for it.

### The path, end to end

```
 Guest (order app, at the table)                         Barista (POS web / pos-mobile)
      │  taps Checkout on /t/{code}/cart
      ▼
  details sheet: name · WhatsApp · dining option · method   (FR-8)
      │   [ QRIS ]  [ COD ]          ← cash hidden by flag (FR-11)
      │
      └── COD ─► live camera viewfinder (getUserMedia, rear camera)      (FR-7)
                 guest photographs their surroundings → preview → "Pakai foto ini"
                 client downsizes to ≤1280px JPEG (~150–300 KB)
              │
              │  POST /carts/current/checkout
              │  { customerName, …, method: "cod", verificationPhoto: "<base64 jpeg>" }
              ▼
        PaymentUsecase.Checkout — COD branch                              (FR-2)
              │  inside BeginTransaction:
              ├─ price cart, reserve availability, CreateTransaction (unpaid, source='order')
              ├─ INSERT payments (method='cod', status='pending',
              │                   verification_status='awaiting',
              │                   expired_at = now + COD_VERIFICATION_EXPIRY_SECONDS)
              ├─ INSERT payment_verification_photos (payment_id, bytes)     (FR-3)
              └─ EnqueueForTransaction(kind='cod_verification')             (FR-9)
           COMMIT ──► TriggerDispatch
              │                                               │
              ▼                                               ▼
   /orders/{reference}                             KDS push: "Verify COD order #12 — Meja 4"
   "Menunggu konfirmasi barista…"                  POS list row: [Order] [Needs confirmation]
   (polls every 3 s)                                          │
              │                                   row menu → Verify                (FR-12)
              │                                   sheet shows the photo, table, items, total
              │                                   ┌──────────────┴──────────────┐
              │                                Approve                        Reject
              │                                   │                              │
              │     PaymentVerificationUsecase.Approve          …Reject          (FR-4)
              │       verification_status='approved'             finalizeUncollectedPayment(
              │       DELETE photo                                  cancelled, reason='rejected')
              │       cart → converted                             ├ transaction soft-deleted
              │       Enqueue(kind='order_paid')  ← "start making" ├ availability released
              │                                   │                └ DELETE photo
              ▼                                   ▼                              │
   "Sedang disiapkan · bayar Rp 45.000      KDS push: "New order #12"            ▼
    di kasir saat mengambil"                barista prepares              guest: "Pesanan ditolak"
              │                                   │
              │                          row menu → Mark as Ready (existing)
              │                                   │  CompleteTransaction → WhatsApp outbox
              ▼                                   ▼
   "Siap diambil! Bayar Rp 45.000"          Fonnte WhatsApp: "Pesanan siap… Bayar di kasir (COD)"
              │                                   │
       guest walks to the counter, shows #12      │
              │                          row menu → Pay (existing TransactionPaymentAlert,
              │                                          wallet chosen by the barista)
              │                          TransactionUsecase.PayTransaction
              │                            ├ payTransaction(): wallet, income, paid_at
              │                            │   (its order_paid enqueue is a no-op — already sent)
              │                            └ settleOrderPayment(): payments.status='paid'
              ▼                                   ▼
            done                          row: [Order] [Ready] [Paid · Cash]
```

**The shape worth noticing:** COD adds exactly one new human step — *verify* — and one new kind of data — *a photo that lives only until that step*. Everything after approval is machinery that already exists: `Mark as Ready` (Fulfil FR-6), the WhatsApp ready message (WA PRD), and the cashier's `Pay` flow with `settleOrderPayment` (Cash FR-6). No new payment gateway, no new transaction column, no new POS pay screen.

### The two state axes

A COD payment moves along **two independent axes**, and keeping them separate is the central design decision (D2):

| Axis | Column | Values for COD | Question it answers |
|---|---|---|---|
| **Money** | `payments.status` (existing) | `pending` → `paid` · or `cancelled` / `expired` | *Has the money been collected?* |
| **Presence** | `payments.verification_status` (**new**) | `awaiting` → `approved` · (`null` for QRIS / cash) | *Has a barista confirmed this guest is in the café?* |

```
                         payments.status = pending                       status = paid
                ┌──────────────────────────────────────────────┐      ┌────────────┐
 checkout ────► │ verification = awaiting ──approve──► approved │─Pay─►│  approved  │
                └───────┬───────────────┬──────────────┬───────┘      └────────────┘
                        │ reject        │ guest cancel │ window elapses (sweeper)
                        ▼               ▼              ▼
           cancelled (reason=rejected)  cancelled (reason=guest)   expired
              └──────────── transaction soft-deleted · availability released · photo DELETED ───┘
```

An **approved** COD payment is `pending` — no money has moved — but is **never expired and never guest-cancellable** (FR-5): the bar has started making it.

### How the user's statuses map onto the data

The acceptance criteria name five transaction statuses. None of them is a new stored column; each is derived from what the row already carries, the same way Fulfil FR-1 derives `preparing` / `ready`:

| Status in the AC | POS badge | `payments` | `transactions` | Guest screen |
|---|---|---|---|---|
| **Need confirmation** | `Needs confirmation` (amber) | `pending`, `awaiting` | unpaid, `completed_at NULL` | *Menunggu konfirmasi barista…* |
| **Preparing** | `Preparing` + `COD · unpaid` | `pending`, `approved` | unpaid, `completed_at NULL` | *Sedang disiapkan · bayar di kasir saat mengambil* |
| **Ready** | `Ready` + `COD · unpaid` | `pending`, `approved` | unpaid, `completed_at` set | *Siap diambil! Bayar Rp X di kasir* |
| **Success / paid** | `Ready` + paid footer | `paid`, `approved` | `paid_at` set | *Siap diambil* (unchanged) |
| **Rejected** | — (row gone: soft-deleted) | `cancelled`, reason `rejected` | `deleted_at` set | *Pesanan ditolak* |

### Changed tables

One migration, `000044_add_payment_verification` (`000043_create_whatsapp_number_verifications` is the latest):

```sql
ALTER TABLE payments
  ADD COLUMN verification_status VARCHAR(16) NULL AFTER status,
  ADD COLUMN verified_at         DATETIME    NULL AFTER verification_status;

CREATE TABLE payment_verification_photos (
  payment_id   BIGINT      NOT NULL,
  content_type VARCHAR(32) NOT NULL,
  byte_size    INT         NOT NULL,
  data         MEDIUMBLOB  NOT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  CONSTRAINT fk_payment_verification_photos_payment
    FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**No other schema change.** `payments.method` (`VARCHAR(16)`) takes `'cod'`; `payments.cancel_reason` (`VARCHAR(16)`, migration `000041`) takes `'rejected'`; `kds_notifications.kind` (`VARCHAR(20)`, migration `000035`) takes `'cod_verification'`. All three are values, not migrations — exactly what QRIS D5 and Cash D8 shaped those columns for.

### New and changed API surface

| Method | Path | Auth | Change |
|---|---|---|---|
| `POST` | `/carts/current/checkout` | session | `method` enum gains `cod`; new optional `verificationPhoto` (base64 JPEG/WebP), **required iff `method = cod`**; `400` when `ORDER_COD_PAYMENT_ENABLED` is off |
| `GET` | `/payments/{ref}`, `/payments` | session / access key | `Payment` and `PaymentSummary` gain `verificationStatus: awaiting \| approved \| null`; `cancelReason` gains `rejected`. **The photo is never in a guest response.** |
| `GET` | `/transactions`, `/transactions/{id}` | `CheckAuth` | `Transaction` gains `paymentVerificationStatus`, joined exactly as `payment_method` already is (`transaction_repo.go:22`) |
| `GET` | `/transactions/{transactionId}/verification` | `CheckAuth` | **new** — `{ photo: "data:image/jpeg;base64,…", capturedAt }`; `404` once the photo is gone |
| `PUT` | `/transactions/{transactionId}/verification/approve` | `CheckAuth` | **new** — `SuccessResponse` |
| `PUT` | `/transactions/{transactionId}/verification/reject` | `CheckAuth` | **new** — `SuccessResponse` |

The staff routes hang off `/transactions/{id}` because that is the only identifier the POS holds (it never sees a payment reference), mirroring `/pay`, `/unpay`, `/complete`.

### Feature flags

| Variable | Where | Default | Effect |
|---|---|---|---|
| `ORDER_COD_PAYMENT_ENABLED` | `apps/api/.env` | `false` | Server-side gate: a `cod` checkout is `400` when off. Verify / approve / reject stay available so orders in flight can drain after the flag is flipped off (D12). |
| `NEXT_PUBLIC_ORDER_COD_PAYMENT_ENABLED` | `apps/order-web` | `false` | Shows the COD option in the details sheet. |
| `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED` | `apps/order-web` | *(existing)* | Set to `false` for the trial — this is how cash is hidden (D11). |
| `COD_VERIFICATION_EXPIRY_SECONDS` | `apps/api/.env` | `600` | How long an unverified COD order waits for a barista before the sweeper expires it (D8). |

Trial configuration: API `ORDER_COD_PAYMENT_ENABLED=true`; order-web `NEXT_PUBLIC_ORDER_COD_PAYMENT_ENABLED=true`, `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED=false` → the sheet shows **QRIS** and **COD**, nothing else.

### Changed backend files

| Layer | File | Change |
|---|---|---|
| Entity | `domain/payment_entity.go` | `PaymentMethodCod`; `PaymentVerificationStatus` (`awaiting`, `approved`); `PaymentCancelReasonRejected`; `Payment.VerificationStatus`, `VerifiedAt`; `IsExpirable()`; `CanBeCancelledBy` refuses an approved payment |
| Entity | `domain/payment_verification_entity.go` | **new** — `PaymentVerificationPhoto`; `ValidateVerificationPhoto(bytes)` (size cap, sniffed content type) |
| Repo iface | `domain/payment_verification_repository.go` | **new** — `Create`, `GetByPaymentId`, `DeleteByPaymentId`, `DeleteOrphaned(ctx, limit)` + `//go:generate mockgen` |
| Use case | `domain/payment_usecase.go` | `Checkout` COD branch (FR-2); `finalizeUncollectedPayment` deletes the photo (FR-6); `refreshPendingCashPaymentStatus` and `expireOne` never expire an approved payment (FR-5) |
| Use case | `domain/payment_verification_usecase.go` | **new** — `GetVerification`, `Approve`, `Reject` (FR-4) |
| Use case | `domain/transaction_usecase.go` | `PayTransaction` refuses a COD payment still `awaiting` (FR-5) |
| Message | `domain/kds_notification_entity.go` | `KdsNotificationKindCodVerification` title/body; `order_paid` body gains a `COD — collect Rp X at pickup` line for an unpaid COD transaction (FR-9) |
| Message | `domain/guest_whatsapp_message.go` | COD label and a pay-at-pickup line (FR-10) |
| MySQL | `data/mysql/payment_{repo,entity,transformer}.go` | new columns; `GetExpirablePayments` excludes `verification_status = 'approved'` |
| MySQL | `data/mysql/payment_verification_repo.go` (+ entity) | **new** |
| MySQL | `data/mysql/transaction_repo.go` | `payments.verification_status AS payment_verification_status` beside the existing `payment_method` select |
| REST | `presentation/restapi/payment_{handler,transformer}.go` | parse/validate `verificationPhoto`; `http.MaxBytesReader` on checkout (none exists today); serialise `verificationStatus` |
| REST | `presentation/restapi/payment_verification_{handler,route,transformer}.go` | **new** — the three staff routes under `CheckAuth` |
| Wiring | `main.go`, `utils/env.go` | the two env vars; the orphan-photo job on the existing maintenance sweeper tick |

`data/doku/**`, `PaymentGatewayRepository` and `TransactionPaymentAlert` are **not touched** (D1).

### Changed frontend slice (`libs/ui`)

```
domain/entities/Payment.ts            PaymentMethod += 'cod'; verificationStatus; PaymentCancelReason += 'rejected'
domain/entities/Transaction.ts        paymentVerificationStatus
domain/repositories/payment.ts        checkout(…, method, verificationPhoto?)
domain/repositories/transaction.ts    fetchVerification / approveVerification / rejectVerification
data/api + data/mock                  the above, plus COD fixtures
domain/usecases/checkout.ts           verificationPhoto in Context; CAPTURE_PHOTO / RETAKE_PHOTO
domain/usecases/orderStatus.ts        awaitingVerification state; COD preparing/ready carry payAtPickup
domain/usecases/transactionVerification.ts   NEW — hidden → loading → shown → approving|rejecting → …

presentation/views/components/base/CameraCapture/   NEW — index.tsx (getUserMedia) + index.native.tsx stub
presentation/views/components/checkout/CustomerDetailsSheet.tsx   method list from enabledMethods; COD photo step
presentation/views/components/checkout/CodVerificationView.tsx    NEW — "Menunggu konfirmasi barista"
presentation/views/components/orderStatus/Order{Preparing,Ready}View.tsx   pay-at-pickup banner
presentation/views/components/transactions/TransactionListItem.tsx   badges; Verify menu item; guards
presentation/views/components/transactions/TransactionVerificationSheet.tsx   NEW — photo + Approve / Reject
presentation/handlers/order/{Cart,OrderStatus}Handler.tsx
presentation/handlers/pos/TransactionListHandler.tsx
app/order/Cart.tsx                    reads NEXT_PUBLIC_ORDER_COD_PAYMENT_ENABLED → enabledMethods
app/pos/TransactionList.tsx           constructs TransactionVerificationUsecase
```

---

## Problem Statement

The order app offers two payment methods today, both behind `CustomerDetailsSheet` (`libs/ui/src/presentation/views/components/checkout/CustomerDetailsSheet.tsx:122`):

- **QRIS** — the guest pays at the table. Good experience; the order goes straight to the bar (`applyQrisStatus` → `payTransaction` → `order_paid` KDS push).
- **Cash at the cashier** (`docs/prd-order-cash-payment.md`) — the guest checks out, then **must walk to the counter immediately** and pay within `CASH_PAYMENT_EXPIRY_SECONDS` (600 s), or `ExpireStalePayments` (`apps/api/domain/payment_usecase.go:513`) cancels the order. Nothing is made until money changes hands, because the KDS `order_paid` notification is enqueued only inside `payTransaction` (`apps/api/domain/transaction_usecase.go:359`).

For a guest who does not want to or cannot pay by QRIS, cash turns "order from your table" back into "queue at the counter" — the exact interaction the order app exists to remove. They then walk to the counter a **second** time to collect their drink. Two trips, one of them to stand in line while nothing is being made.

### Root cause

The system ties **"start making it"** to **"money collected"**. For a gateway payment that is the right rule: the money is certain before the bar lifts a finger. For a guest paying cash it forces the payment trip to happen *before* preparation, so the guest pays and then waits, instead of waiting at the table and paying on pickup.

Café staff already know how to make an unpaid order safely — they do it every time a known guest says "I'll pay when I pick it up". The risk they manage is **the guest who is not actually here** (a prank order from outside, a guest who has already left). What the system is missing is a way for staff to make that judgement from the POS: evidence that the guest is in the café, a decision, and then the ordinary prepare → ready → pay flow — with the payment step *last*.

---

## How comparable products handle this

- **"Bayar di kasir" / pay-later in Indonesian QR-ordering products** (the category this app follows, see Fulfil PRD Sources) is common for dine-in: the order goes to the kitchen and the bill is settled at the counter or at the table on the way out. Their fraud control is the *table* — a QR bound to a physical seat.
- **Delivery COD** (GoFood / GrabFood cash) verifies the *customer's account history* and caps order value; the courier bears the no-show risk.
- **Proof-of-presence by photo** is used by attendance and field-sales apps (a selfie or surroundings photo taken in-app, never from the gallery), reviewed by a human or by geofencing.

This design combines the first and third: the table QR already implies presence, and the live photo plus a human decision closes the gap the table QR leaves open (a QR photographed and used from outside, or a guest who left). A value cap, borrowed from delivery COD, is raised as an Open Question rather than assumed.

> **Verification note.** As in Cash PRD's equivalent section, no vendor documentation was fetched while writing this; the paragraph is general familiarity with the category and the design does not depend on it describing any specific product accurately. No Sources section is offered rather than a fabricated one.

---

## Alternatives Considered

### 1. How the verification state is modelled

**Option A — an orthogonal `payments.verification_status` column; the money state stays `pending` until paid. (Recommended)**
- ✅ True to the data: an approved COD order *is* uncollected money. `pending` is the honest money state, and every consumer of "pending" keeps meaning the right thing — `settleOrderPayment` still flips it to `paid` (`transaction_usecase.go:283`), order history still lists it (`paymentHistoryFilter`, `payment_repo.go:76`), idempotency still finds it (`GetPendingPaymentByCartId`).
- ✅ Rejection reuses the existing terminal shape: `cancelled` + `cancel_reason = 'rejected'`, through `finalizeUncollectedPayment` — release, soft-delete, done.
- ✅ `null` for QRIS and cash, so no existing row changes meaning.
- ❌ Two places carry the COD lifecycle (status + verification). Every "is this pending payment expirable / cancellable?" check has to ask the second column too — FR-5 names the three that must.

**Option B — new values on `payments.status`: `awaiting_verification`, `approved`, `rejected`.**
- ✅ One column, one state machine.
- ❌ Every one of the dozen `pending` reads in the payment path (idempotency, cart lock via `IsAwaitingPayment`, history, sweeper, cancel, settle, the frontend's `stateTypeForPayment` `match(...).exhaustive()`) must be audited and most widened to `IN (...)`. Missing one is a silent bug — e.g. a cart that stops freezing.
- ❌ `approved` would sit in a column that otherwise answers "where is the money", while no money has moved.

**Option C — the state on `transactions` (a `verification_status` there).**
- ✅ The POS already reads transactions.
- ❌ A verification is a property of the *guest's payment attempt*, and it must be visible on the guest's `/payments/{ref}` read — which is a payment read. It would also put a COD-only column on every POS and rental row (Fulfil D22's "never read without a source guard" trap, again).

### 2. Where the photo lives

**Option A — a dedicated MySQL table, `payment_verification_photos`, `MEDIUMBLOB`, hard-deleted on decision. (Recommended)**
- ✅ **Atomic with the decision.** Approve, reject, cancel and expiry already run inside `BeginTransaction`; the `DELETE` joins that transaction, so "decided but photo still stored" cannot exist — the AC's storage promise is enforced by the database, not by a best-effort cleanup.
- ✅ No new infrastructure on a single-VPS deployment (`docs/trd-vps-deployment-automation.md`), no new credentials, no new backup target.
- ✅ A separate table keeps ~250 KB blobs out of every `SELECT payments.*` — the guest status poll and the history list never touch it.
- ❌ BLOBs in MySQL are usually a smell. Here the volume is bounded by *orders awaiting verification right now* (typically 0–5 rows, each ≤ 1 MiB) because every row is deleted within `COD_VERIFICATION_EXPIRY_SECONDS`; InnoDB reuses freed pages. It is a queue, not an archive.

**Option B — files on the VPS disk (`/var/lib/gatherloop-pos/cod/…`).**
- ✅ Idiomatic for binary data.
- ❌ Not transactional: a crash between the DB commit and `os.Remove` leaves an orphan file; the reverse leaves a row pointing at nothing. Needs a reconciler to keep the AC's promise.
- ❌ New operational surface: a directory, permissions under the systemd unit (`apps/api/gatherloop-pos-api.service`), and a path the next deploy must preserve.

**Option C — object storage (S3 / R2 / GCS).**
- ✅ Scales without thought; lifecycle rules can auto-delete.
- ❌ A new vendor, credentials and network dependency on the checkout path — for a trial whose steady state is a handful of short-lived images.

### 3. How "camera only, never the gallery" is enforced

**Option A — an in-app live viewfinder via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, captured to a canvas. (Recommended)**
- ✅ The only browser mechanism that *guarantees* the image came from the camera at that moment — there is no file picker in the flow at all, so there is no gallery to pick from.
- ✅ The canvas step downsizes and re-encodes (≤ 1280 px, JPEG q≈0.7), which both caps upload size and strips EXIF (including GPS) for privacy.
- ❌ Requires a camera permission prompt, HTTPS (already true) and a supported browser. In-app browsers (WhatsApp, Instagram) and very old WebViews may not support it — FR-7 falls back to "use QRIS", never to the gallery.

**Option B — `<input type="file" accept="image/*" capture="environment">`.**
- ✅ Zero UI to build; opens the native camera on most phones.
- ❌ `capture` is a *hint*: several Android browsers show a chooser including the gallery, and desktop ignores it entirely. It fails the AC as written ("must be camera, not pick up from gallery").

**Option C — geolocation / Wi-Fi-based presence instead of a photo.**
- ✅ No human review.
- ❌ Not what the AC asks for; browser geolocation indoors is tens of metres off, and a permission prompt for location is a harder sell than for a camera. Recorded as a possible *complement* (Out of Scope).

### 4. How the photo reaches the API

**Option A — base64 inside the existing checkout JSON. (Recommended)**
- ✅ One request, one DB transaction: the order and its evidence are created together or not at all. No orphan uploads.
- ✅ Stays inside the OpenAPI-generated JSON clients on both sides; no multipart handling in the Go handlers or the TS client.
- ❌ ~33% encoding overhead — ~300 KB becomes ~400 KB. Irrelevant at one photo per order.

**Option B — `multipart/form-data` checkout.** ❌ Changes the content type of an existing endpoint every client uses, and the generated clients handle multipart awkwardly.

**Option C — upload first (`POST /verification-photos` → id), then checkout with the id.** ❌ Two requests, and a guest who uploads then abandons leaves an orphan the system must garbage-collect — the very storage problem the AC forbids.

---

## Proposed Solution

### Acceptance criteria → requirements

| AC | Requirement |
|---|---|
| Customer must open the camera (not gallery) and photograph their surroundings | FR-7, FR-8 |
| A transaction is created with payment method COD and status "need confirmation" | FR-1, FR-2, FR-12 |
| Barista opens the transaction item menu and chooses Verify | FR-12 |
| The image is shown with Approve and Reject | FR-4, FR-12 |
| Approved → preparing; rejected → rejected, payment and transaction deleted | FR-4, FR-13 |
| After approval the barista prepares the order | FR-4, FR-9 |
| Mark ready → WhatsApp sent → customer picks up and pays | FR-10 (existing ready flow) |
| Barista pays (chooses wallet) → transaction success and paid | FR-5 (existing pay flow + guard) |
| Verification image removed after it is confirmed (approved or rejected) | FR-3, FR-4, FR-6 |
| Trial feature flag; cash hidden so only QRIS and COD are shown | FR-11 |

### FR-1 — COD crosses the contract (API)

- `PaymentCheckoutRequest.method` enum becomes `[qris, cash, cod]`; `ParsePaymentMethod` accepts `cod`.
- `PaymentCheckoutRequest.verificationPhoto` — optional `string` (base64, no data-URL prefix). The **handler** rejects `method = cod` without it, and any other method *with* it, with `400` — the use case never sees an inconsistent pair.
- `Payment.verificationStatus`, `PaymentSummary.verificationStatus` — `enum [awaiting, approved]`, nullable. `cancelReason` enum gains `rejected`.
- `Transaction.paymentVerificationStatus` — same enum, nullable, `null` for POS rows.
- `Payment.RequiresGateway()` is unchanged (`method == qris`), so COD takes the non-gateway branch everywhere cash does — expiry on the clock, no DOKU query — without a new condition (Cash D2's "fail closed" rule doing its job).

### FR-2 — The COD checkout branch (API)

`PaymentUsecase.Checkout` keeps every step before payment creation. For `method = cod`:

| Step | Behaviour |
|---|---|
| Gate | `ORDER_COD_PAYMENT_ENABLED` off ⇒ `400 "payment method is not available"` before any write. |
| Photo | `ValidateVerificationPhoto` — decoded ≤ `codVerificationPhotoMaxBytes` (1 MiB), `http.DetectContentType` ∈ {`image/jpeg`, `image/webp`}; else `400`. Runs **before** `BeginTransaction`, like the WhatsApp check (WA-validation D5). |
| Payment | `status = pending`, `verification_status = awaiting`, `expired_at = now + COD_VERIFICATION_EXPIRY_SECONDS`, `qr_content = ''`. |
| Photo row | `PaymentVerificationRepository.Create` inside the same transaction. |
| KDS | `EnqueueForTransaction(kind = cod_verification)` — see FR-9 — and `TriggerDispatch` after commit, as the cash branch does (`payment_usecase.go:279`). |
| Idempotency | Unchanged and method-agnostic (QRIS D11): a live pending payment on the cart is returned as-is, **and its stored photo is not replaced** — the barista verifies the photo the order was created with. |

The checkout route gains `http.MaxBytesReader` at 2 MiB. Nothing in `presentation/restapi` bounds a request body today; the photo is what makes that matter.

### FR-3 — The photo store (API)

`payment_verification_photos` (see migration) behind `PaymentVerificationRepository`:

```go
Create(ctx, photo PaymentVerificationPhoto) *Error
GetByPaymentId(ctx, paymentId int64) (PaymentVerificationPhoto, *Error)
DeleteByPaymentId(ctx, paymentId int64) *Error          // NotFound is not an error
DeleteOrphaned(ctx, limit int) (int64, *Error)           // photos whose payment is not pending+awaiting
```

**Invariant (D5): a photo row exists if and only if its payment is `cod`, `pending` and `awaiting`.** Every transition out of that state deletes the photo in the same DB transaction (FR-4, FR-6). `DeleteOrphaned` is a backstop, run on the existing maintenance sweeper tick (`KDS_DISPATCH_INTERVAL_SECONDS`), that should always delete zero rows; a non-zero count is logged at `warn` because it means some path broke the invariant.

The photo is **never** logged, never included in a guest response, and never included in a `Transaction` or list response — only `GET /transactions/{id}/verification` returns it.

### FR-4 — Verify, approve, reject (API)

New `PaymentVerificationUsecase` in `domain/payment_verification_usecase.go`. All three methods resolve the payment with `GetPaymentByTransactionIdForUpdate` — the same row lock `PayTransaction` takes (`transaction_usecase.go:236`), so approve, reject, a guest cancel and the sweeper serialise instead of racing (Cancel D6).

**`GetVerification(ctx, transactionId)`** → `{ photo, capturedAt }`. `404` if there is no linked payment, it is not COD, or the photo is gone (already decided).

**`Approve(ctx, transactionId)`** — guards: linked payment exists, `method = cod`, `status = pending`, `verification_status = awaiting`; otherwise `400` naming the state ("order already verified", "order was cancelled"). Then, in one transaction:
1. `verification_status = approved`, `verified_at = now`;
2. `DeleteByPaymentId` — the AC's storage promise;
3. cart → `converted`, so the guest can start a new order while this one is made (the cart was frozen since checkout, Cash D12);
4. `EnqueueForTransaction(kind = order_paid)` — the bar's existing "start making it" signal (D6);
5. `TriggerDispatch` after commit.

A payment whose `expired_at` has passed but which the sweeper has not yet reached (≤ 15 s) **is still approvable**: the lock makes it a clean race, and the barista's decision beats a sweeper that is late by a tick (Cash D23's spirit).

**`Reject(ctx, transactionId)`** — same guards. Then `finalizeUncollectedPayment(ctx, payment, PaymentStateCancelled, &PaymentCancelReasonRejected, …)`, which already moves the payment to `cancelled`, releases availability and soft-deletes the transaction (`payment_usecase.go:418`) — and, from FR-6, deletes the photo. `verified_at = now` is set as well so the decision time is recorded. No KDS retraction: the `cod_verification` push asked a barista to look, and a barista just did.

"All payment and transaction will be deleted" in the AC is implemented as the codebase's existing meaning of deleted: the transaction is **soft-deleted** (absent from every POS list and report, `deleted_at` set) and the payment reaches a terminal state. Hard-deleting them would break the guest's status page — which must be able to say *"ditolak"* — and the audit trail every other terminal path keeps (D7).

### FR-5 — The lifecycle guards an approved order needs (API)

An approved COD payment is `pending` (Option A) but must behave as *committed*:

| Path | Today, for any pending non-gateway payment | For COD |
|---|---|---|
| Sweeper `GetExpirablePayments` (`payment_repo.go:117`) | expires when `expired_at < now` | adds `AND (verification_status IS NULL OR verification_status <> 'approved')` |
| Guest poll `refreshPendingCashPaymentStatus` (`payment_usecase.go:832`) | expires on the clock | returns unchanged when `!payment.IsExpirable()` |
| Guest cancel `CanBeCancelledBy` (`payment_entity.go`) | any pending payment of the session | `false` once `approved` — the bar is making it |
| Cashier pay `PayTransaction` (`transaction_usecase.go:224`) | pays any unpaid transaction | `400 "verify the order before taking payment"` while `awaiting` |
| `Mark as Ready` `CompleteTransaction` | any order transaction | `400` while `awaiting` — nothing should be made before approval |

`Payment.IsExpirable()` = `status == pending && verification_status != approved`, and is the single predicate the domain-side paths above ask.

Paying an approved COD order runs the existing path unchanged: `payTransaction` credits the wallet the barista chose, and its `order_paid` enqueue is a no-op because approval already inserted that `(transaction_id, kind)` row (KDS D4 / Cash D8's unique key) — so paying does **not** buzz the bar a second time. `settleOrderPayment` flips the payment to `paid`; the cart is already converted, which it tolerates.

### FR-6 — Every terminal path deletes the photo (API)

`finalizeUncollectedPayment` gains the `PaymentVerificationRepository` and calls `DeleteByPaymentId` for `method = cod`. That one edit covers reject (FR-4), guest cancel (`CancelPayment`), sweeper expiry (`expireOne` → `expirePayment`), guest-poll expiry, and supersede (`supersedeLivePayments`) — every way a COD order can end without approval — because they already share this function (Cash FR-4's "one definition of what giving up does").

### FR-7 — Camera capture (frontend)

A new base component `presentation/views/components/base/CameraCapture/` with the platform split already used by `base/Chart/index.native.ts`:

- `index.tsx` (web): requests `getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })`, renders a live `<video>` viewfinder with a shutter button, draws the frame to a canvas scaled to ≤ 1280 px on the long edge, and emits `onCapture(base64Jpeg)` via `canvas.toBlob('image/jpeg', 0.7)`. Stops every track on unmount and on capture.
- `index.native.tsx`: renders nothing and reports `isSupported = false` — `apps/pos-mobile` never checks out, but Metro must still bundle `libs/ui`.

States it renders: *requesting permission*, *live*, *preview* (with **Ulangi** / **Pakai foto ini**), *denied* (*"Izinkan akses kamera untuk memakai COD, atau pilih QRIS."*), *unsupported* (*"Browser ini tidak mendukung kamera. Silakan pilih QRIS."*). There is **no** file input anywhere in the component, in any state (D3).

The guidance line above the viewfinder: *"Foto suasana di sekitar meja Anda agar barista bisa memastikan Anda berada di kafe. Foto hanya dipakai untuk verifikasi dan langsung dihapus setelah dikonfirmasi."*

### FR-8 — The details sheet offers COD (frontend)

- `CustomerDetailsSheet` replaces `isCashPaymentEnabled: boolean` with `enabledMethods: PaymentMethod[]`. The picker renders when there are ≥ 2; with one method there is no picker (today's single-method behaviour, generalised).
- The COD option: **COD — Bayar saat ambil** / *"Pesanan dibuat setelah dikonfirmasi barista, bayar tunai di kasir saat mengambil"*.
- Selecting COD reveals the `CameraCapture` step inside the sheet. The primary button reads *"Ambil foto dulu"* (disabled) until a photo is accepted, then *"Pesan dengan COD"*.
- `CheckoutUsecase` owns the photo, not the component: `Context.verificationPhoto: string | null`, actions `CAPTURE_PHOTO { photo }` and `RETAKE_PHOTO`, both valid in `askingName`. `SUBMIT_NAME` with `method = 'cod'` and no photo is ignored by the reducer. `CHANGE_METHOD` away from COD clears the photo. (FSM rule from the root `CLAUDE.md`.)
- `app/order/Cart.tsx` builds `enabledMethods` from the two flags: `['qris', …(cash ? ['cash'] : []), …(cod ? ['cod'] : [])]`.

### FR-9 — What the KDS hears (API)

| Kind | When | Title | Body |
|---|---|---|---|
| `cod_verification` **(new)** | COD checkout | `Verify COD order #12 — Meja 4` | `Check the photo in the POS · Rp 45.000` |
| `order_paid` *(existing kind)* | COD **approval**; QRIS/cash **payment** | `New order #12 — Meja 4` *(unchanged)* | station lines *(unchanged)*, plus `COD — collect Rp 45.000 at pickup` when the transaction is COD and unpaid |

`cod_verification`, like `cash_pending`, bypasses the station rule and the business-day staleness rule (Cash D9): it is a request for a human decision, written the instant the transaction exists. `order_paid` keeps both rules — it is the preparation signal and a board-game-only COD order still needs nothing made.

### FR-10 — The ready WhatsApp message (API)

`BuildGuestWhatsappMessage` (`domain/guest_whatsapp_message.go:11`) for a COD transaction that is still unpaid:

- `*Pembayaran:* COD — bayar di kasir` (instead of `Tunai` / `QRIS`);
- a line before the link: `Siapkan pembayaran *Rp 45.000* saat mengambil pesanan di kasir.`

The outbox, claim rules and dispatcher are unchanged — `CompleteTransaction` already enqueues regardless of payment state (`transaction_usecase.go:442`).

### FR-11 — Feature flag and hiding cash

See the flag table in the overview. Two rules:

1. **The server gate is authoritative.** The frontend flag hides the option; `ORDER_COD_PAYMENT_ENABLED` is what stops an old tab, a curl, or a cached bundle from creating COD orders — and with it, stored photos — when the trial is off.
2. **Turning the trial off never strands an order.** Approve / reject / pay stay available for COD orders already in flight; the flag only closes the front door.

Cash is hidden by configuration (`NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED=false`), not by deleting code, so ending the trial in either direction is an env change and a redeploy of `order-web`, not a release.

### FR-12 — The POS: badges, Verify, and what is hidden while unverified (frontend)

`TransactionListItem`, for `source === 'order' && paymentMethod === 'cod'`:

| State | Badges | Row menu |
|---|---|---|
| `awaiting` | `Order` · **`Needs confirmation`** (amber) | **Verify** (first item). **Pay, Mark as Ready, Delete hidden.** Print Order Slip hidden (nothing to make yet). |
| `approved`, unpaid | `Order` · `Preparing`/`Ready` · **`COD · unpaid`** | Pay, Mark as Ready/Preparing, Print Order Slip — as for any order. |
| paid | `Order` · `Preparing`/`Ready` | unchanged |

**Verify** opens `TransactionVerificationSheet`: customer name, table, transaction number, items and total from the row, and the photo loaded from `GET /transactions/{id}/verification` (a spinner while loading; *"Photo no longer available — this order was already verified or cancelled"* on `404`, which then refetches the list). Two buttons: **Approve** (primary) and **Reject** (destructive, with a one-step *"Reject order #12? The guest's order will be cancelled."* confirm). Success toasts and refetches, as `transactionDelete` does in `TransactionListHandler`.

Driven by `TransactionVerificationUsecase` (`hidden → loading → shown → approving | confirmingReject → rejecting → success | error`), with `.test.ts`, real-usecase handler tests over `MockTransactionRepository`, and stories for every sheet state. `pos-mobile` inherits it through the shared `app/pos/TransactionList.tsx`; the `<Image source={{ uri: dataUrl }}>` renders on both.

`TransactionDetail` gains the payment-method row value `COD` and the verification state; the Verify action there is Deferred (the AC names the list-row menu).

### FR-13 — What the guest sees (frontend)

`OrderStatusUsecase.stateTypeForPayment` (`libs/ui/src/domain/usecases/orderStatus.ts:46`):

| Payment | New state / variant | Copy |
|---|---|---|
| `pending`, `cod`, `awaiting` | **`awaitingVerification`** → `CodVerificationView`, polls every 3 s | *"Menunggu konfirmasi barista…"* · transaction number · items · *"Pesanan akan dibuat setelah barista mengonfirmasi. Jika tidak dikonfirmasi dalam 10 menit, pesanan dibatalkan otomatis."* · Cancel button (existing, when the cancel flag is on) |
| `pending`, `cod`, `approved` | `preparing` / `ready` by `fulfillmentStatus` (existing views) | plus a banner: *"Bayar Rp 45.000 di kasir saat mengambil pesanan"* |
| `paid`, `cod` | `preparing` / `ready` (unchanged) | no banner |
| `cancelled`, reason `rejected` | `cancelled` variant | *"Pesanan ditolak"* / *"Barista tidak dapat memastikan Anda berada di kafe. Silakan pesan ulang dengan QRIS atau hubungi kasir."* · **Kembali ke keranjang** |

The existing `ready` terminal rule (Fulfil D10) holds: the page stops polling on `ready`, and the pay-at-pickup banner is what the guest carries to the counter.

---

## Design decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** | COD is a `payments.method` value (`cod`), with no gateway, settled by the cashier's existing Pay flow. | Same argument as Cash D1/D2: every payment consumer (status page, history, freeze, idempotency, sweeper) then covers COD, `RequiresGateway()` keeps DOKU out, and `settleOrderPayment` already closes the loop at the till. **Rejected:** a separate COD entity. |
| **D2** | Verification is a **second axis** (`payments.verification_status`), not new `payments.status` values; the money state stays `pending` until paid. | An approved COD order has no money collected, so `pending` is true; every existing "pending" consumer stays correct. Option B would force an audit of a dozen `pending` reads where one miss is a silent bug. **Accepted cost:** five paths must ask "approved?" explicitly — FR-5 lists them and `IsExpirable()` is the one predicate. |
| **D3** | The photo is taken with an **in-app `getUserMedia` viewfinder**; there is no file input anywhere in the flow. | The only browser mechanism that meets "camera, not gallery". `capture=` is a hint several Android browsers ignore. Canvas re-encoding also bounds size and strips EXIF/GPS. **Accepted cost:** in-app browsers without `getUserMedia` cannot use COD; they are told to use QRIS. |
| **D4** | The photo is stored in **MySQL, in its own table**, and **hard-deleted** — not soft-deleted — in the same DB transaction as the decision. | Atomicity makes the AC's "removed after confirmed" a database guarantee, with no orphan reconciler and no new infrastructure on a single VPS. A separate table keeps blobs off every payment read. Soft-delete would keep the bytes, defeating the point. **Rejected:** disk (non-transactional), object storage (new vendor for a queue of ≤ 5 items). |
| **D5** | **Invariant:** a photo exists iff its payment is `cod` + `pending` + `awaiting`. Every exit deletes it; a sweeper backstop logs any orphan at `warn`. | States the storage promise as something a test can assert and an operator can monitor, instead of a hope. |
| **D6** | **Approval** enqueues the existing `order_paid` KDS kind; payment's later enqueue is then a no-op via the `(transaction_id, kind)` unique key. | `order_paid` is, operationally, "the bar may start" — for QRIS/cash that moment is payment, for COD it is approval. Reusing the kind means one bar notification per order, the station and staleness rules apply unchanged, and `payTransaction` needs no COD branch. **Rejected:** a new `cod_approved` kind — `payTransaction` would then also send `order_paid`, buzzing the bar twice for one drink unless it grew a COD special case. **Accepted:** the stored name `order_paid` is now slightly inaccurate for COD; renaming a stored enum value across history buys nothing. |
| **D7** | "Rejected … payment and transaction deleted" means **soft-delete of the transaction + terminal `cancelled`/`rejected` payment** — the photo is the only thing hard-deleted. | Matches every other terminal path (expiry, guest cancel, supersede) and keeps the guest's status page able to say "rejected". Hard-deleting the transaction would also orphan its `transaction_number` and `kds_notifications` rows. |
| **D8** | An unverified COD order **expires** after `COD_VERIFICATION_EXPIRY_SECONDS` (default 600 s), via the existing sweeper. An approved one **never** expires. | Without it, a busy bar that never looks leaves a guest waiting on a frozen cart and a photo in storage indefinitely. After approval, the order is being made — expiring it would delete food in progress. |
| **D9** | Payment and Mark-as-Ready are **refused while `awaiting`**, in the use case, and hidden in the menu. | Paying first would skip the decision and leave the photo stored (breaking D5); making it first is exactly the risk verification exists to prevent. Server-side because the menu is an affordance, the use case is the rule (Cash D24's pattern). |
| **D10** | The guest **cannot cancel** once approved; they can while `awaiting`. | Before approval nothing has been made (Cancel PRD's reasoning holds). After approval the bar is making it; a cancel would be a free no-show. |
| **D11** | Cash is hidden by **config** (`NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED=false`); the sheet renders whatever `enabledMethods` contains. | The AC wants two methods shown for the trial, not cash deleted. Generalising the picker to a list is smaller than special-casing "COD replaces cash", and either trial outcome is an env change. |
| **D12** | The COD flag gates **checkout only**, and exists **on the server** as well as the client. | A client flag alone cannot stop an old bundle or a direct call from storing photos. Gating approve/reject/pay too would strand in-flight orders the moment the trial is paused. |
| **D13** | The photo travels as **base64 in the checkout JSON**, capped at 1 MiB decoded, with a 2 MiB `MaxBytesReader` on the route. | One request, one transaction, no orphan uploads, no multipart in generated clients. The cap is ~4× the expected size after client downscaling. |
| **D14** | Staff verification routes hang off **`/transactions/{id}`**, under `CheckAuth`; the photo is **never** in a guest-facing or list response. | The POS only knows transaction ids (same as `/pay`, `/complete`). A photo of the room can include other guests — it is staff-only, fetched on demand, and gone after the decision. |
| **D15** | A COD checkout buzzes the KDS (`cod_verification`), bypassing the station rule. | The decision has to be made quickly or the guest waits; the barista is the one who has to look at the POS. Same reasoning as Cash D9. |
| **D16** | Approval **converts the cart**. | The guest can add a second order while the first is made, and the idempotency rule (QRIS D11) stops finding a payment that is no longer the cart's live attempt. `settleOrderPayment` tolerates an already-converted cart. |

---

## Phased plan

Fourteen PRs. Each leaves `main` green and shippable; no guest can reach COD before phase 14, because both flags default off (D12) and phase 1 makes the API reject `cod` until phase 4.

| # | Phase | Side | Touches | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | COD vocabulary in the contract and domain | API | `api.yaml`, `payment_entity.go`, transformers | — | A |
| 2 | Schema and photo store | API | migration `000044`, `payment_verification_*`, `payment_repo.go`, `transaction_repo.go` | 1 | B |
| 3 | KDS `cod_verification` kind and COD pickup line | API | `kds_notification_entity.go` | 1 | B |
| 4 | COD checkout branch | API | `payment_usecase.go` (Checkout), handler, env | 2, 3 | C |
| 5 | Verify / approve / reject | API | `payment_verification_usecase.go`, handler, route, `main.go` | 2 | C |
| 6 | Lifecycle guards and photo cleanup | API | `payment_usecase.go` (finalize/expiry), `transaction_usecase.go`, `payment_entity.go`, sweeper | 2 | C |
| 7 | COD ready WhatsApp message | API | `guest_whatsapp_message.go` | 1 | B |
| 8 | Order-app frontend slice | `libs/ui` | `Payment.ts`, payment repos, `checkout.ts`, `orderStatus.ts` | 1 | B |
| 9 | `CameraCapture` base component | `libs/ui` | `components/base/CameraCapture/*` | — | A |
| 10 | Details sheet offers COD | `libs/ui` | `CustomerDetailsSheet`, `CartHandler`, `app/order/Cart.tsx` | 8, 9 | C |
| 11 | Guest status screens for COD | `libs/ui` | `CodVerificationView`, `Order{Preparing,Ready}View`, `OrderStatusHandler` | 8 | C |
| 12 | POS verification slice | `libs/ui` | `Transaction.ts`, transaction repos, `transactionVerification.ts` | 1 | B |
| 13 | POS badges, Verify sheet, menu guards | `libs/ui` | `TransactionListItem`, `TransactionVerificationSheet`, `TransactionListHandler` | 12 | C |
| 14 | Enable, verify, document | all | e2e, `docs-site`, `.env.example`, README | all | D |

### Dependency graph

A dependency means **the later phase does not compile, or has nothing to test, without the earlier one merged**. Phases with no arrow between them can be built at the same time by different people.

```
 wave A            wave B                       wave C                         wave D

 1 contract ──┬──► 2 schema + ──────┬────────► 4 COD checkout ─────────────┐
   + domain   │      photo store    │            ▲                         │
              │                     ├────────► 5 verify / approve / reject ┤
              │                     │            │                         │
              │                     └────────► 6 lifecycle guards ─────────┤
              │                                  │                         │
              ├──► 3 KDS kind ───────────────────┘ (4 needs 3)             │
              │                                                            │
              ├──► 7 WhatsApp copy ────────────────────────────────────────┤
              │                                                            ├──► 14 enable
              ├──► 8 order FE slice ──┬───────► 10 details sheet ─────────►┤     verify
              │                       │           ▲                        │     document
              │                       └───────► 11 status screens ────────►┤
              │                                   │                        │
              └──► 12 POS FE slice ───────────► 13 POS badges + Verify ───►┤
                                                  │                        │
 9 CameraCapture ─────────────────────────────────┘ (10 needs 9)           │
   (no deps — pure component) ─────────────────────────────────────────────┘
```

**Waves** — everything in a wave can run concurrently:

| Wave | Phases | Notes |
|---|---|---|
| **A** | **1, 9** | Two people on day one. 9 has no dependency at all — it is a self-contained web component with stories. |
| **B** | **2, 3, 7, 8, 12** | All unblocked by phase 1 alone. Five PRs, no shared files. 8 and 12 open the two frontend tracks as soon as the TS client is regenerated. |
| **C** | **4, 5, 6, 10, 11, 13** | The widest wave. See file contention below — 4 and 6 are the only pair that should be sequenced. |
| **D** | **14** | Needs everything, by definition. |

**Critical path: 1 → 2 → 4 → 14** (also 1 → 8 → 10 → 14), four phases deep. With three or more people the calendar length is that chain plus phase 14's manual verification; every other phase fits beside it.

**File contention is the real constraint, not the graph:**

- **4 and 6 both edit `apps/api/domain/payment_usecase.go`** (4: `Checkout`; 6: `finalizeUncollectedPayment`, `refreshPendingCashPaymentStatus`, `expireOne`). Different functions, but the constructor gains a dependency in both. Land **4 then 6**, or give both to one owner.
- **4, 5 and 6 all touch `apps/api/main.go`** (env, wiring, sweeper). Mechanical conflicts only.
- **All contract changes live in phase 1**, so no later phase edits `api.yaml` and the regenerated clients never conflict. Phase 1 declares the three staff endpoints; phase 5 implements them.
- **8 and 11** both touch the order-status slice: 8 owns `orderStatus.ts`, 11 owns the views and handler — keep that split.

**If only one person is working:** 1 → 2 → 3 → 4 → 5 → 6 → 9 → 8 → 10 → 11 → 12 → 13 → 7 → 14. After phase 5 the whole backend flow is demoable with `curl`; after 13 it is demoable end to end with flags on locally.

> Every phase that touches the contract (only phase 1) regenerates both clients (`npx nx run api-contract:generate:go`, `:generate:ts`) and may need the new symbols in `libs/ui/src/__mocks__/api-contract.ts`.

### Phase 1 — COD vocabulary in the contract and domain (API)

**Depends on:** nothing.
**Deliver:** FR-1 in full: `method` enum `cod`, `verificationPhoto`, `verificationStatus` on `Payment`/`PaymentSummary`, `cancelReason: rejected`, `Transaction.paymentVerificationStatus`, and the three staff operations (`getTransactionVerification`, `approveTransactionVerification`, `rejectTransactionVerification`) with their `200/400/404` responses. `PaymentMethodCod`, `PaymentVerificationStatus`, `PaymentCancelReasonRejected`, `Payment.VerificationStatus/VerifiedAt`, `Transaction.PaymentVerificationStatus` in `domain/`; restapi transformers serialise them. `ParsePaymentMethod` accepts `cod`, but the handler returns `400 "payment method is not available yet"` for it. Both clients regenerated.
**Tests:** `ParsePaymentMethod` for `cod`; handler: `cod` without a photo → `400`, `qris` with a photo → `400`, `cod` with a photo → `400 not available yet`; transformer: `verificationStatus` is `null` for QRIS/cash.
**Done when:** existing checkout, status and transaction responses are unchanged apart from the new nullable fields, and `npx nx run api:test && npx nx run ui:test` are green.

### Phase 2 — Schema and photo store (API)

**Depends on:** 1 (domain fields).
**Deliver:** migration `000044_add_payment_verification` (up/down via `make migrate-create`); `PaymentVerificationPhoto` entity and `ValidateVerificationPhoto`; `PaymentVerificationRepository` interface with `//go:generate mockgen`, MySQL implementation, regenerated mock; `payment_repo.go` reads/writes `verification_status`, `verified_at`; `transaction_repo.go` selects `payments.verification_status AS payment_verification_status` next to `payment_method` (both list and by-id queries, lines 22 and 123).
**Tests:** repo tests: create/get/delete; `DeleteByPaymentId` on a missing row is not an error; `DeleteOrphaned` deletes photos of a `cancelled`, `expired`, `paid` and an `approved` payment and keeps the `awaiting` one; `ON DELETE CASCADE` holds; `ValidateVerificationPhoto` accepts JPEG/WebP ≤ 1 MiB and rejects PNG-disguised-as-JPEG by sniffing, oversize, and empty input. Migration up → down → up clean with `MIGRATIONS_DIR=data/mysql/migrations`.
**Done when:** the table exists, and nothing writes to it yet.

### Phase 3 — KDS `cod_verification` kind and COD pickup line (API)

**Depends on:** 1 (`PaymentMethodCod`, `Transaction.PaymentMethod`).
**Deliver:** FR-9 — `KdsNotificationKindCodVerification`, its title and body in `BuildKdsPushMessage`, the station-rule and staleness bypass alongside `cash_pending`'s, and the `COD — collect Rp X at pickup` line on `order_paid` for an unpaid COD transaction. No new enqueue site yet.
**Tests:** message builder table tests for both kinds; `order_paid` for QRIS, cash and paid COD is byte-for-byte unchanged; `cod_verification` is sent for a transaction with no station items.
**Done when:** `kds_notification_entity_test.go` covers every kind × method combination.

### Phase 4 — COD checkout branch (API)

**Depends on:** 2 (photo store), 3 (kind to enqueue). Land before 6 (shared file).
**Deliver:** FR-2 — `ORDER_COD_PAYMENT_ENABLED`, `COD_VERIFICATION_EXPIRY_SECONDS` in `utils/env.go` and `.env.example`; `NewPaymentUsecase` gains the flag, the window and the verification repository; the COD branch in `Checkout`; `http.MaxBytesReader` on the checkout route; phase 1's "not available yet" rejection replaced by the flag check.
**Tests:** a COD checkout creates an unpaid order transaction, a `pending`/`awaiting` payment with the COD window, one photo row and one `cod_verification` KDS row, and **never calls the gateway**; flag off → `400` and no writes; invalid photo → `400` before `BeginTransaction`; idempotent retry returns the existing payment and **keeps the original photo**; a body over 2 MiB → `413`/`400`.
**Done when:** `curl` with a JPEG creates a COD order that appears in `GET /transactions` with `paymentVerificationStatus: "awaiting"`.

### Phase 5 — Verify / approve / reject (API)

**Depends on:** 2. Independent of 4 in code (tests build the payment through the mock repository).
**Deliver:** FR-4 — `PaymentVerificationUsecase` (`GetVerification`, `Approve`, `Reject`), `payment_verification_{handler,route,transformer}.go` under `CheckAuth` with `http.MethodOptions` for the `PUT`s, and wiring in `main.go`.
**Tests:** approve → `approved`, `verified_at`, photo deleted, cart converted, `order_paid` enqueued, dispatch triggered after commit; reject → `cancelled`/`rejected`, transaction soft-deleted, availability released, photo deleted; both refuse a non-COD, already-decided, cancelled or paid payment with `400`; approve succeeds past `expired_at` if still `pending`; `GetVerification` returns `404` after either decision; handler tests for all three routes including `401` without a token.
**Done when:** approve and reject work end to end against a phase-4 COD order via `curl`.

### Phase 6 — Lifecycle guards and photo cleanup (API)

**Depends on:** 2. Land after 4 (shared `payment_usecase.go`).
**Deliver:** FR-5 and FR-6 — `Payment.IsExpirable()`; `GetExpirablePayments` excludes approved; `refreshPendingCashPaymentStatus` leaves an approved payment alone; `CanBeCancelledBy` refuses approved; `PayTransaction` and `CompleteTransaction` refuse `awaiting`; `finalizeUncollectedPayment` deletes the COD photo; `DeleteOrphaned` on the maintenance sweeper tick with a `warn` on a non-zero count.
**Tests:** an approved COD payment past `expired_at` survives both the sweeper and a guest poll; an awaiting one expires and loses its photo; a guest cancel while awaiting deletes the photo and one after approval is refused; paying or completing while awaiting is `400` and writes nothing; paying an approved COD order does **not** create a second `order_paid` row and flips the payment to `paid`; QRIS and cash behaviour unchanged across all of the above.
**Done when:** the D5 invariant holds in every test path, and `npx nx run api:test` is green.

### Phase 7 — COD ready WhatsApp message (API)

**Depends on:** 1.
**Deliver:** FR-10 in `guest_whatsapp_message.go`.
**Tests:** `guest_whatsapp_message_test.go` — unpaid COD shows the COD label and amount line; paid COD, QRIS and cash are unchanged.
**Done when:** the message reads correctly in the test golden strings.

### Phase 8 — Order-app frontend slice (`libs/ui`)

**Depends on:** 1 (regenerated TS client).
**Deliver:** `PaymentMethod` += `'cod'`, `verificationStatus`, `PaymentCancelReason` += `'rejected'` on the `Payment`/`PaymentSummary` entities and transformers; `PaymentRepository.checkout(…, verificationPhoto?)` in api and mock repositories, with COD fixtures; `CheckoutUsecase` `verificationPhoto` context and `CAPTURE_PHOTO`/`RETAKE_PHOTO`; `OrderStatusUsecase` `awaitingVerification` state (3 s poll) and COD mapping. The handler maps `awaitingVerification` onto the existing cash variant for now, so this phase changes nothing on screen. **No UI.**
**Tests:** `checkout.test.ts` — COD submit without a photo is ignored; with one it calls the repository with the photo; changing method clears it; error branch via `setShouldFail(true)`. `orderStatus.test.ts` — `awaiting` → `awaitingVerification` → (poll, approved) → `preparing` → `ready`; `rejected` → `cancelled`.
**Done when:** both machines are green headlessly.

### Phase 9 — `CameraCapture` base component (`libs/ui`)

**Depends on:** nothing.
**Deliver:** FR-7 — `components/base/CameraCapture/index.tsx` (web) and `index.native.tsx` (stub), exported from the base barrel; stories for *requesting*, *live* (with a fake stream), *preview*, *denied*, *unsupported*. No hand-written memoisation (React Compiler).
**Tests:** a component test with a stubbed `navigator.mediaDevices` asserting capture emits a JPEG base64 string ≤ the size cap and stops all tracks; denied → the QRIS guidance renders; **no `input[type=file]` is rendered in any state**.
**Done when:** on a real phone (Android Chrome and iOS Safari) the rear camera opens, a photo is captured, and the emitted image is ≤ 1280 px and ≤ 400 KB.

### Phase 10 — Details sheet offers COD (`libs/ui`)

**Depends on:** 8 (checkout machine), 9 (camera).
**Deliver:** FR-8 — `enabledMethods` replaces `isCashPaymentEnabled` in `CustomerDetailsSheet`, `CartScreen`, `CartHandler`; the COD option and in-sheet camera step; `app/order/Cart.tsx` reads `NEXT_PUBLIC_ORDER_COD_PAYMENT_ENABLED`; `.env.example` entry; stories for `[qris]`, `[qris, cash]`, `[qris, cod]` and COD with/without a photo.
**Tests:** `CartHandler.test.tsx` — with `[qris, cod]` there is no cash option; selecting COD disables submit until a photo is captured; submitting sends `method: 'cod'` with the photo and redirects to `/orders/{reference}`; with `[qris]` no picker renders.
**Done when:** with both flags set locally, a COD order is created from the cart with a real camera photo.

### Phase 11 — Guest status screens for COD (`libs/ui`)

**Depends on:** 8.
**Deliver:** FR-13 — `CodVerificationView` with stories; the `awaitingVerification` variant on `OrderStatusScreen`; the pay-at-pickup banner on `OrderPreparingView`/`OrderReadyView` for approved-unpaid COD; the rejected copy on the `cancelled` variant; `OrderStatusHandler` maps them exhaustively.
**Tests:** `OrderStatusHandler.test.tsx` per variant; the banner is absent once paid; the cancel button shows while awaiting and not after approval.
**Done when:** a COD order's page walks awaiting → preparing (banner) → ready (banner) on a phone-width viewport as the POS acts.

### Phase 12 — POS verification slice (`libs/ui`)

**Depends on:** 1.
**Deliver:** `Transaction.paymentVerificationStatus` on the entity and transformer; `fetchTransactionVerification`, `approveTransactionVerification`, `rejectTransactionVerification` on `TransactionRepository` (api + mock); `TransactionVerificationUsecase` in `domain/usecases/transactionVerification.ts`, barrel-exported. **No UI.**
**Tests:** `transactionVerification.test.ts` — open → loading → shown; approve → success; reject requires the confirm step; a `404` on load lands in a `gone` state; error branch via `setShouldFail(true)`.
**Done when:** the machine is green headlessly.

### Phase 13 — POS badges, Verify sheet, menu guards (`libs/ui`)

**Depends on:** 12.
**Deliver:** FR-12 — `Needs confirmation` and `COD · unpaid` badges; the **Verify** menu item; Pay / Mark as Ready / Delete / Print Order Slip hidden while awaiting; `TransactionVerificationSheet` with stories (loading, shown, approving, confirm-reject, gone, error); wiring in `TransactionListHandler` and `app/pos/TransactionList.tsx`; the COD value on `TransactionDetail`'s payment-method row.
**Tests:** `TransactionListHandler.test.tsx` with the real use case over mock repositories — Verify → photo shown → Approve → toast, refetch, badge becomes `Preparing` + `COD · unpaid`; Reject → confirm → row disappears; Pay is absent while awaiting.
**Done when:** a barista can verify a COD order from the list on POS web and on `pos-mobile`.

### Phase 14 — Enable, verify, document

**Depends on:** every other phase.
**Deliver:** an `order-web-e2e` spec (cart → COD → camera capture → awaiting screen → API-side approve → preparing → ready) run with Chromium's `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`; a `pos-web-e2e` spec (verify → approve → mark ready → pay → paid; and verify → reject → row gone); `docs-site/sales/order-checkout.md`, `transactions.md` and `kds.md` updated; README setup pointed at the new variables; production env: API `ORDER_COD_PAYMENT_ENABLED=true`, order-web `NEXT_PUBLIC_ORDER_COD_PAYMENT_ENABLED=true` and `NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED=false`; `MIGRATIONS_DIR=data/mysql/migrations make migrate-up` on the API host before the binary that needs `000044`.
**Done when:** a real guest at a table orders by COD with a camera photo, the KDS buzzes, a barista verifies from the POS, the bar gets "New order", the guest gets the WhatsApp ready message, pays at the counter into the chosen wallet, and `SELECT COUNT(*) FROM payment_verification_photos` returns 0.

Both e2e suites run post-merge only in CI (`.github/workflows/e2e-main.yml`), so each must pass locally before its PR merges.

---

## Risks

| Risk | Mitigation |
|---|---|
| **No-show after approval** — the order is made and the guest never pays. The inherent cost of COD. | Verification is the control; the photo plus the table QR make "not in the café" the unlikely case. The order stays in the POS as `Ready · COD · unpaid`, which is findable. An order-value cap is Open Question 2. Success metric 3 measures it. |
| **The photo is spoofed** — a photo of a screen showing the café, or taken just before leaving. | Accepted: no browser API proves location. The barista's judgement — "is that *this* room, *today*, *that* table?" — is the control the AC specifies. Canvas re-encoding means no EXIF is trusted anyway. |
| **Privacy** — photos include other guests' faces. | Staff-only route (D14), never logged, never in list or guest responses, deleted at the decision or within the verification window (D4, D5, D8). The guest is told so in the capture copy (FR-7). |
| **Barista too busy to verify** → the guest waits. | The KDS push (D15), the amber badge, and the 10-minute expiry that frees the cart and the storage (D8). If expiry becomes common, shorten the window or add a POS nav badge count (Deferred). |
| **Camera unavailable** (permission denied, in-app browser, desktop). | FR-7 degrades to "use QRIS", never to a file picker. Metric 4 tracks COD attempts that stop at the camera step. |
| **Large request bodies** — the first endpoint to accept ~0.5 MB. | `MaxBytesReader` on the checkout route (D13); the server re-validates size and type regardless of the client. |
| **Photo storage grows** if a path forgets to delete. | D5's invariant is tested in phase 6 and backstopped by `DeleteOrphaned` with a `warn`. Worst case is bounded by orders created within the sweeper interval. |
| **Hiding cash surprises regulars who used it.** | It is a config flip; COD is a superset from the guest's point of view (still cash, paid later). Revert is one env var on `order-web`. |

---

## Out of scope

| Not doing | Why |
|---|---|
| Automatic presence detection (geofence, venue Wi-Fi, image recognition) | Not in the AC; a human decision is the specified control. Geofencing is the natural complement if spoofing becomes real. |
| Verify from `TransactionDetail` or the KDS app | The AC names the list-row menu; the detail action is a small follow-up. |
| A "needs confirmation" count on the POS nav | Deferred until verification delay is measured (Risks). |
| Guest re-taking a photo after rejection | A rejected order is terminal; the guest checks out again. |
| Keeping photos for dispute or audit | The AC requires deletion; storing them longer would reverse the privacy posture. |
| Removing the cash-at-the-cashier code | Hidden by config for the trial (D11); a decision for after the trial. |

---

## Open questions

1. **What happens to an approved COD order that is never collected?** Today staff can Delete an unpaid transaction (`DeleteTransactionById`), but that does not finalise its payment row — the guest page would keep showing "ready". *Recommendation:* for the trial, leave it as `Ready · COD · unpaid` and handle by hand; if it happens more than rarely, route `Delete` on an order transaction through `finalizeUncollectedPayment` with a `staff` cancel reason (a small, separate PR).
2. **Should COD have a maximum order value** (e.g. Rp 150.000), as delivery COD does, to bound the no-show loss? *Recommendation:* start without one and decide from metric 3 after two weeks.
3. **Is 10 minutes the right verification window?** Default mirrors the cash window; a busy bar may need 15.
4. **Should rejection also message the guest on WhatsApp?** *Recommendation:* no — the page they are looking at updates within 3 s, and a WhatsApp "rejected" to someone possibly not in the café invites an argument.

---

## Success criteria (for the trial)

1. **COD share of order-app checkouts**, compared with cash's share before the trial — the number the trial exists to measure.
2. **Verification latency** — `verified_at − created_at`, median and p90. Above ~3 minutes means the bar needs a louder signal.
3. **No-show rate** — approved COD orders not paid by end of day. The number that decides whether the trial continues, gets a value cap, or ends.
4. **Camera drop-off** — COD selected but no photo captured (permission denied / unsupported). High numbers point at in-app browsers.
5. **Zero stored photos for decided payments** — `payment_verification_photos` rows whose payment is not `pending`/`awaiting`, and zero `DeleteOrphaned` warnings. Any occurrence is a bug against D5.
