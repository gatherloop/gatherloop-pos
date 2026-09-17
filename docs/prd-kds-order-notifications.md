# PRD: KDS Push Notifications — Telling the Barista and the Kitchen an Order Arrived

**Status:** Draft for review
**Scope:** a new React Native (Expo) app, `apps/kds-mobile`, and the backend that pushes a
notification to it when a transaction is paid. **Display of the order queue is explicitly not in
this PRD** — this is the notification pipe and nothing else.

---

## Problem Statement

[`docs/prd-table-ordering.md`](./prd-table-ordering.md) and
[`docs/prd-order-checkout-qris-doku.md`](./prd-order-checkout-qris-doku.md) delivered an
end-to-end self-service path: the guest scans the table QR, builds a cart, pays by QRIS, and a
paid transaction with `source = 'order'` appears in the POS.
[`docs/prd-order-fulfillment-status.md`](./prd-order-fulfillment-status.md) then closed the back
half — the barista marks the order ready and the guest's page updates.

**Nothing tells the barista the order exists.**

A guest order arrives with no counter interaction, no verbal handoff and no bell. The paid
transaction is written to MySQL and it sits there. The only ways a staff member finds out today
are:

1. **Somebody is looking at the POS.** `TransactionListUsecase` fetches on mount and on filter
   change; there is no interval, so even an open transaction list does not learn about a new row
   until a human refreshes it.
2. **Somebody prints the order slip.** `buildOrderSlipPayload`
   (`libs/ui/src/utils/print.ts`) splits a transaction into a `BAR` slip and a `KITCHEN` slip and
   the printer produces paper — but only when a staff member opens the row menu and taps
   **Print Order Slip**. The printer is an *output* of a human noticing, not a trigger.

So the guest's order-app experience, at its most polished, is: pay, watch a page that says
*"Sedang disiapkan"*, and wait for a barista who does not know they exist to look at a screen
they are not looking at. The fulfilment PRD anticipated exactly this gap and parked it —
**Open Question 3, *"Does the venue want a sound or a visible counter on the POS when a new order
arrives?"*** — because arrival is a different problem from completion. This PRD answers it.

The same hole exists, less severely, on the POS side. A cashier keys in an order at the register
and the barista standing two metres away learns about it by being told, or by the slip that prints
if the cashier remembers to print it. That works at one counter and stops working the moment the
bar and the kitchen are in different rooms, which they already are — that is why
`categories.station` exists.

### Root cause

**The system has no outbound channel.** Every piece of information in this product moves because a
client asked for it: the POS fetches, the order app polls, the printer prints on a tap. There is
no mechanism anywhere in `apps/api` for the server to initiate contact with a staff device, and
no staff device that can be contacted — `apps/pos-mobile` is an interactive tool a cashier holds,
not an always-on receiver.

A kitchen display system is the standard answer, and the first thing it has to do is *arrive*.
Everything else a KDS does — the queue, the ticket ages, the bump — is a view over data this
system already has (`docs/prd-order-fulfillment-status.md` §*Designing for a future KDS*
inventories exactly what is already served). The notification is the only genuinely missing
capability, and it is the one that changes what staff experience. So it ships first, alone.

---

## How the Industry Handles This

Every production KDS separates **routing** (which station does this item belong to) from
**alerting** (how the station finds out), and treats the alert as the thing that must never be
missed.

- **Toast KDS** — tickets route to station-specific screens by menu-group configuration. New
  tickets trigger an audible chime and a visual flash on the screen they routed to; the screen is
  a dedicated always-on device, not a shared terminal.
- **Square KDS** — same shape: per-station ticket routing with a configurable new-order sound,
  plus an "expo" screen that sees everything.
- **Deliverect / Otter (order aggregators)** — the closest analogue to our problem, because their
  orders also arrive with no human present. Both ship a tablet app whose entire job for a new
  order is **push notification + persistent audible alarm until acknowledged**, precisely because
  a silent arrival in a busy kitchen is an order that gets made twenty minutes late.
- **GoFood / GrabFood merchant apps** — the pattern Indonesian venues already know: a push
  notification with a loud, distinct sound, on a dedicated phone that stays on the counter.

Three consistent lessons:

1. **The alert is push to a dedicated device, not a refresh of a shared screen.** Nobody ships
   "the cashier will notice."
2. **Routing uses the station taxonomy the menu already has.** No product ever asks the operator
   to maintain a second one for notifications.
3. **The notification carries the order number and little else.** It is a summons, not a
   document — the ticket itself is read off the screen or the slip.

---

## Alternatives Considered

### 1. When does a POS transaction notify?

The order app's trigger is given by the acceptance criteria: *when the transaction is paid*. The
POS side is open, and there are three candidate moments.

**Option A — On `POST /transactions` (transaction created).**

- ✅ Earliest possible signal; the barista can start while the guest pays.
- ❌ **A POS transaction is mutable until it is paid.** `UpdateTransactionById` rejects edits only
  once `PaidAt` is set (`apps/api/domain/transaction_usecase.go:107`), so a transaction notified at
  creation can have its items rewritten afterwards, and the notification the barista acted on is
  no longer what the guest is buying.
- ❌ `DeleteTransactionById` allows deleting an unpaid transaction
  (`transaction_usecase.go:187`). A mis-keyed order that the cashier immediately deletes would
  still have summoned the bar.
- ❌ Two triggers, two code paths, two sets of guards, for one concept.

**Option B — On payment. ← Recommended**

- ✅ **One trigger for both sources, at one line of code.** `payTransaction`
  (`apps/api/domain/transaction_usecase.go:209`) is a free function called by exactly two callers:
  `TransactionUsecase.PayTransaction` (the POS `PUT /transactions/{id}/pay` route) and
  `PaymentUsecase.applyQrisStatus` (the order app's QRIS confirmation). Every paid transaction in
  the system passes through it. There is no third path to forget.
- ✅ Payment is the moment the ticket becomes **immutable** — the `PaidAt` guard above is what
  makes "what the barista was told" and "what the guest bought" the same thing, permanently.
- ✅ It matches what the POS cashier already does: at this venue payment precedes preparation at
  the counter.
- ✅ It covers the rental/board-game checkout path for free, which creates a transaction through
  `RentalUsecase.CheckoutRentals` and is paid later through the same `/pay` route.
- ❌ A venue that runs open bills (order now, pay at the end) would notify too late. This venue
  does not, and the escape hatch is small and explicit — see Open Question 1.

**Option C — An explicit *Send to Kitchen* button in the POS.**

- ✅ Total cashier control; decouples the alert from the money entirely.
- ❌ It is a step a busy cashier will forget, which is the exact failure mode this PRD exists to
  remove — it re-creates "somebody has to remember to print the slip" with a different verb.
- ❌ It does not help the order app at all, so it is an additional mechanism, not an alternative.

**Verdict: Option B.** One trigger, one insertion point, both sources, and the immutability
argument is the one that actually decides it.

### 2. How do we avoid summoning the barista for a board-game ticket?

**Option D — Route on `categories.station`, which already exists. ← Recommended**

- ✅ `station VARCHAR(20) NOT NULL DEFAULT 'NONE'` has been on `categories` since migration
  `000015_add_category_station.up.sql:1`, is editable from the POS category form
  (`CategoryFormView.tsx`), and carries `BAR | KITCHEN | NONE`
  (`libs/ui/src/domain/entities/Category.ts`).
- ✅ **It is already the venue's answer to this exact question.** `buildOrderSlipPayload`
  (`libs/ui/src/utils/print.ts`) filters items into a `BAR` list and a `KITCHEN` list and
  **returns `null` when both are empty** — i.e. the system already declines to print a slip for a
  transaction that is nothing but board-game tickets. This PRD adopts that rule verbatim, in Go.
- ✅ It is correct by default: `NONE` is the column default, so a ticket, rental or merchandise
  category that nobody ever configured is silent without anybody doing anything.
- ✅ It scales past the stated requirement — a mixed transaction (a board-game ticket *and* a
  latte) notifies the bar about the latte only, and a food item notifies the kitchen only.
- ❌ It depends on the operator having the station set correctly per category. Mitigated: it is
  already load-bearing for printing, so it is already correct in production, and a wrong value is
  visible on the category list (`CategoryListItem.tsx` renders `Station: …`).

**Option E — A `notify_kitchen` boolean on products or categories.**

- ✅ Explicit; no inference.
- ❌ A second taxonomy that means almost exactly what `station` means, guaranteed to drift out of
  sync with it, and a migration plus a form field to maintain it.

**Option F — Filter on `products.sale_type = 'rental'`.**

- ✅ No new data.
- ❌ Wrong axis. `sale_type` distinguishes renting from selling; it says nothing about whether
  something must be *made*. A sold board game is `purchase` and still needs no barista; a rented
  item that came with a drink would be missed.

**Option G — A configured category allowlist in `.env`.**

- ❌ Puts menu configuration in a systemd `EnvironmentFile`, where the operator cannot reach it
  and nobody will remember it exists when a category is added.

**Verdict: Option D.** The requirement "don't wake the barista for a board-game ticket" is already
solved in this codebase for printing; this is the same rule, moved one layer down.

### 3. How does the notification reach the phone?

**Option H — Expo Push Notification Service, proxied by our API. ← Recommended**

- ✅ One `POST https://exp.host/--/api/v2/push/send` with a bearer token; no Google service
  account JSON on the VPS, no OAuth token lifecycle in Go.
- ✅ `expo-notifications` gives the device token, the Android channel and the permission flow in
  one library, which is the whole reason the acceptance criteria name Expo.
- ✅ Handles APNs and FCM behind one endpoint, and returns per-token receipts including
  `DeviceNotRegistered`, which is exactly the signal needed to prune a dead device (D18).
- ❌ A third-party hop between our API and Google/Apple. Bounded: it is a staff convenience
  notification, not money, and the gateway is behind an interface (D7) so replacing it is one
  `data/` package.

**Option I — FCM HTTP v1 directly from Go.**

- ✅ No intermediary; the endpoint every Android push eventually goes through anyway.
- ✅ Supports topics (`/topics/bar`), which would remove the device table.
- ❌ Service-account credentials and OAuth2 token refresh to manage on the VPS, and a separate
  APNs path for iOS. Real work for an MVP whose first question is "does the phone buzz at all."
- ❌ Topics are attractive and wrong here — see D8.

**Option J — WebSocket or SSE from `apps/api` to the KDS app.**

- ❌ Does not wake a phone. A backgrounded or screen-off device has no socket, which is the
  failure mode this feature exists to fix.
- ❌ `apps/api` is a stateless `net/http` + `gorilla/mux` binary under systemd
  ([`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md)); long-lived
  connections are an operational change, not a feature. Recorded as rejected in
  `docs/prd-order-fulfillment-status.md` D16 for the guest app, and the argument is stronger here.

**Option K — The KDS app polls and raises a local notification.**

- ✅ No push infrastructure at all.
- ❌ iOS and Android both suspend background timers; a polling app that has been backgrounded for
  twenty minutes is not polling. This is the single most common way a "we'll just poll" KDS fails.

**Verdict: Option H**, behind `KdsPushGatewayRepository` so Option I stays a one-package swap.

### 4. What guarantees the notification actually goes out?

**Option L — Call the push gateway inline, inside the payment's DB transaction.**

- ❌ Disqualified. `payTransaction` runs inside `BeginTransaction`; an HTTP call to Expo inside an
  open MySQL transaction holds row locks for the duration of someone else's network, and a
  gateway timeout **rolls back a payment that already succeeded at DOKU**. Never.

**Option M — Fire-and-forget goroutine after the transaction commits.**

- ✅ Twenty lines, no new table.
- ❌ Unobservable and unretryable: a 500 from Expo, a process restart mid-send, or a deploy at the
  wrong second means an order nobody was told about and no record that it happened. When the
  barista says *"I never got it"*, there is nothing to look at.

**Option N — Transactional outbox: enqueue in the payment's transaction, dispatch after commit,
with a background sweeper for retries. ← Recommended**

- ✅ The enqueue is atomic with the payment: if the money moved, the notification exists as a row.
  If the payment rolls back, so does the intent to notify.
- ✅ Retryable and inspectable — `SELECT * FROM kds_notifications WHERE status = 'failed'` answers
  the support question directly.
- ✅ Idempotent by schema: `UNIQUE (transaction_id, station)` (D4).
- ✅ Testable at the use-case level over a mock repository, in the style every
  `*_usecase_test.go` in `apps/api/domain` already uses — no HTTP in the test.
- ❌ One table, one goroutine, one ticker. The honest cost, and it is two small phases.

**Verdict: Option N.**

---

## System Design Overview

### The path, end to end

```
 POS cashier                          Guest (order app)
      │  PUT /transactions/{id}/pay        │  QRIS paid at DOKU
      ▼                                    ▼
 TransactionUsecase.PayTransaction   PaymentUsecase.applyQrisStatus
      │                                    │
      └──────────────┬─────────────────────┘
                     ▼
        payTransaction()   ← transaction_usecase.go:209, the ONE trigger
                     │   (inside BeginTransaction)
                     ├─ wallet balance, income, paid_at      (unchanged)
                     └─ KdsNotificationUsecase.EnqueueForPaidTransaction
                            │
                            ├─ StationsToNotify(transaction)  → []{BAR, KITCHEN}
                            │     items whose variant.product.category.station
                            │     is BAR or KITCHEN; empty ⇒ nothing enqueued
                            └─ INSERT kds_notifications (transaction_id, station)
                     │
                  COMMIT
                     │
                     ▼
        dispatch now (goroutine)  ◄── every 15s, sweeper picks up stragglers
                     │
                     ▼
        KdsPushGatewayRepository.Send(messages)
                     │   POST https://exp.host/--/api/v2/push/send
                     ▼
        Expo Push ──► APNs / FCM ──► apps/kds-mobile on the bar phone
```

The two producers converge before the trigger, which is the property that makes this feature one
insertion point instead of two. It also means it is covered no matter *who observes* the QRIS
payment first: `applyQrisStatus` is reached both from `ConfirmPayment` (DOKU notify) and from
`refreshPendingPaymentStatus` (the guest's status page re-querying DOKU), and the unique key makes
the race harmless.

### New tables

Migrations `000031` and `000032` (`000030_create_availability_movements` is the latest).

```sql
-- 000031_create_kds_devices.up.sql
CREATE TABLE kds_devices (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,          -- "Bar phone", "Kitchen tablet"
  station     VARCHAR(20)  NOT NULL,          -- 'BAR' | 'KITCHEN'
  push_token  VARCHAR(255) NOT NULL,          -- ExponentPushToken[...]
  platform    VARCHAR(20)  NOT NULL,          -- 'ios' | 'android'
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP   NULL,
  deleted_at  TIMESTAMP    NULL,
  UNIQUE KEY uq_kds_devices_push_token (push_token),
  KEY idx_kds_devices_station (station, deleted_at)
);

-- 000032_create_kds_notifications.up.sql
CREATE TABLE kds_notifications (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT      NOT NULL,
  station        VARCHAR(20) NOT NULL,        -- 'BAR' | 'KITCHEN'
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  attempt_count  INT         NOT NULL DEFAULT 0,
  last_error     TEXT        NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at        TIMESTAMP   NULL,
  UNIQUE KEY uq_kds_notifications_transaction_station (transaction_id, station),
  KEY idx_kds_notifications_status (status, created_at)
);
```

`kds_notifications` stores **no copy of the message**. The dispatcher re-reads the transaction by
id and builds the payload at send time; a paid transaction cannot be edited
(`transaction_usecase.go:107`), so there is nothing to snapshot against.

Neither table takes a foreign key to `transactions`, matching every other table in this schema.

### New API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/kds/devices` | `CheckAuth` | Register or refresh this device's push token (upsert by token) |
| `GET` | `/kds/devices` | `CheckAuth` | List registered devices — troubleshooting, and the KDS app's own "am I registered" check |
| `DELETE` | `/kds/devices/{deviceId}` | `CheckAuth` | Unregister — logout, or a lost phone |
| `POST` | `/kds/devices/{deviceId}/test-notification` | `CheckAuth` | Send a test push to one device |

Four routes in one `kds_device_route.go`, all behind `CheckAuth`
(`presentation/restapi/base_middlewares.go`); `POST`/`DELETE` also list `http.MethodOptions` for
CORS preflight. **No public routes** — a KDS is staff equipment, and nothing here is reachable by
a guest.

Contract additions in `libs/api-contract/src/api.yaml`: `KdsDevice`, `KdsDeviceRequest`,
`KdsStation` (`BAR | KITCHEN`), and the four operations. Nothing on the `Transaction` schema
changes — the notification is a side effect of payment, not a field on it.

### New backend files

| Layer | File | Contents |
| --- | --- | --- |
| Entity | `domain/kds_device_entity.go` | `KdsDevice`, `KdsStation`, `KdsPlatform` |
| Entity | `domain/kds_notification_entity.go` | `KdsNotification`, `KdsNotificationStatus`, `KdsPushMessage` |
| Rule | `domain/kds_notification_routing.go` | `StationsToNotify(Transaction) []KdsStation` — pure, no I/O |
| Repo iface | `domain/kds_device_repository.go` | CRUD + `GetKdsDevicesByStations` |
| Repo iface | `domain/kds_notification_repository.go` | outbox CRUD, plus `KdsPushGatewayRepository` |
| Use case | `domain/kds_device_usecase.go` | register/list/delete/test |
| Use case | `domain/kds_notification_usecase.go` | `EnqueueForPaidTransaction`, `DispatchPending` |
| MySQL | `data/mysql/kds_device_{repo,entity,transformer}.go` | |
| MySQL | `data/mysql/kds_notification_{repo,entity,transformer}.go` | |
| Gateway | `data/expopush/kds_push_repo.go` | mirrors `data/doku/` exactly |
| Mock | `data/mock/kds_*_repository.go` | generated by `go generate ./...` |
| REST | `presentation/restapi/kds_device_{handler,route,transformer}.go` | |

Changed: `domain/transaction_usecase.go` (`payTransaction` gains the outbox dependency, and both
`TransactionUsecase` and `PaymentUsecase` gain the field), `main.go` (wiring + the dispatcher
goroutine), `utils/env.go` (`EXPO_PUSH_ACCESS_TOKEN`, `KDS_DISPATCH_INTERVAL_SECONDS`).

### New frontend slice (`libs/ui`)

```
domain/entities/KdsDevice.ts               KdsDevice, KdsDeviceForm, KdsStation, schema
domain/repositories/KdsDeviceRepository.ts  API-side: register / list / delete / test
domain/repositories/PushTokenRepository.ts  device-side: getPermissionStatus, requestPermission, getPushToken
domain/usecases/kdsDeviceRegister.ts (+ .test.ts)
domain/usecases/kdsTestNotification.ts (+ .test.ts)
data/api/kdsDevice.ts, kdsDevice.transformer.ts
data/mock/kdsDevice.ts, pushToken.ts
data/native/ExpoPushTokenRepository.ts      the only file that imports expo-notifications
presentation/handlers/kds/KdsDeviceSetupHandler.tsx (+ .test.tsx)
presentation/views/screens/kds/KdsDeviceSetupScreen.tsx (+ .stories.tsx)
presentation/views/screens/kds/KdsLoginScreen.tsx (+ .stories.tsx)
app/kds/{KdsDeviceSetup,AuthLogin,index}.tsx
index.kds.ts                                → @gatherloop-pos/ui/kds
```

`@gatherloop-pos/ui/kds` becomes the third import graph alongside `/pos` and `/order`, with the
mirror-image `no-restricted-imports` blocks in `libs/ui/.eslintrc.json`
(`docs/trd-ui-presentation-split-by-app.md`).

### New app and its screens

`apps/kds-mobile` — Expo, two screens, and that is the entire app in this PRD:

| Screen | Contents |
| --- | --- |
| **Login** | Username + password, the existing `AuthLoginUsecase` and JWT (D10). Identical in behaviour to the POS login, its own screen file (D12). |
| **Device Setup** | Station selector (**Bar** / **Kitchen**), device name field, notification-permission status with a *Grant permission* action, **Register this device**, **Send test notification**, and a *Registered as "Bar phone" · BAR* confirmation state. Plus **Unregister** and **Log out**. |

After registering, the app's job is to be open (or closed — push does not care) on a phone on the
counter. There is no queue, no ticket list and no bump button; that is the next PRD.

### The notification itself

```
┌──────────────────────────────────────────────┐
│  New order #12 · BAR                         │
│  Table 4 — 2× Kopi Susu Gula Aren, 1× Americano │
└──────────────────────────────────────────────┘
```

- **Title:** `New order #{transactionNumber} · {STATION}` — the daily transaction number from
  [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md), which is the number
  printed on the slip and shown on the guest's phone, and therefore the one thing every surface
  already agrees on.
- **Body:** the customer/guest name or table label, then **only this station's items** —
  `2× Kopi Susu Gula Aren, 1× Americano`. The kitchen's notification for the same transaction
  lists only the kitchen's items. Truncated to four items plus `+N more`.
- **Data payload:** `{"transactionId": 123, "transactionNumber": 12, "station": "BAR",
  "source": "order"}` — carried so the future KDS view can deep-link to the ticket without any
  contract change.
- **Android:** channel `orders`, importance `MAX`, default sound, vibration — created by the app
  on first launch so the alert is audible in a noisy room.
- **Copy is English**, matching every other staff surface (D15).

---

## Proposed Solution

### FR-1 — One trigger: a transaction becoming paid

`payTransaction` (`apps/api/domain/transaction_usecase.go:209`) gains one call, inside the
existing `BeginTransaction` callback, after the wallet and income writes succeed:

```go
if err := kdsNotificationRepository.EnqueueForTransaction(ctx, transaction); err != nil {
    return err
}
```

Its two callers — `TransactionUsecase.PayTransaction` (POS, `PUT /transactions/{id}/pay`) and
`PaymentUsecase.applyQrisStatus` (order app, QRIS confirmed) — each pass the repository through
their existing constructor. No other code path creates a paid transaction, so no other code path
needs to know this feature exists.

An enqueue failure fails the payment. That is deliberate and safe: the enqueue is a local
`INSERT` in a transaction that is already open, with no network in it (D5). The only realistic
failure is the database being down, in which case the payment was failing anyway.

### FR-2 — The station rule decides who gets woken

```go
func StationsToNotify(transaction Transaction) []KdsStation
```

Pure, in `domain/kds_notification_routing.go`, with no I/O and its own `_test.go`:

1. For each `transaction.TransactionItems`, read
   `item.Variant.Product.Category.Station` — already preloaded on the entity the trigger holds
   (`apps/api/data/mysql/transaction_repo.go:118` preloads
   `TransactionItems.Variant.Product.Category`).
2. Collect the distinct values that are `BAR` or `KITCHEN`. `NONE`, empty and any unrecognised
   value are ignored.
3. Return them in a stable order (`BAR`, then `KITCHEN`).

| Transaction | Stations | Result |
| --- | --- | --- |
| 2 coffees | `[BAR]` | bar devices notified |
| 1 coffee + 1 sandwich | `[BAR, KITCHEN]` | two notifications, each listing only its own items |
| 1 board-game ticket | `[]` | **no notification at all** |
| 1 board-game ticket + 1 coffee | `[BAR]` | bar notified, about the coffee only |
| a rental checkout (`RentalUsecase.CheckoutRentals`, paid later at the register) | `[]` | **no notification** |

The board-game exclusion is therefore not a special case in the code — it is what the general
rule does, because a ticket's category is `NONE`. This is the same predicate
`buildOrderSlipPayload` (`libs/ui/src/utils/print.ts`) uses to decide there is no slip worth
printing, so notification and printing agree by construction (D2, D3).

### FR-3 — The outbox

`EnqueueForTransaction` inserts one `kds_notifications` row per returned station, `status =
'pending'`. `UNIQUE (transaction_id, station)` makes it idempotent: the insert uses
`INSERT … ON DUPLICATE KEY UPDATE id = id`, so a duplicate enqueue is a no-op rather than an
error (D4).

Consequences worth stating plainly:

- A payment observed twice (DOKU notify and the guest's status poll racing) notifies once.
- **Unpay followed by re-pay does not re-notify.** The bar was already told about order #12 and
  the correction is to the money, not to the drink. If the venue ever wants the opposite, it is a
  `DELETE` in `UnpayTransaction` and one line of reasoning to change (D4).

### FR-4 — The dispatcher

`KdsNotificationUsecase.DispatchPending(ctx)`:

1. Claim up to 50 rows with `status = 'pending'` and `attempt_count < 5`, oldest first.
2. Group by `transaction_id`, load each transaction once, and for each row build the FR-6 message
   for its station.
3. Look up the target devices: `GetKdsDevicesByStations(ctx, stations)` — not soft-deleted.
   A station with no registered device marks the row `sent` with a warning log; there is nobody to
   tell, and retrying does not create a device.
4. `KdsPushGatewayRepository.Send(ctx, messages)` — one batched call.
5. Per-token results: success → `status = 'sent'`, `sent_at = now()`. Failure → `attempt_count++`,
   `last_error` set, back to `pending`; at 5 attempts it becomes `failed` and stops.
   `DeviceNotRegistered` soft-deletes the device (D18).

It runs in two ways, which is the standard outbox shape: **immediately after the payment commits**
(a goroutine, so the cashier's HTTP response is not waiting on Expo), and **every
`KDS_DISPATCH_INTERVAL_SECONDS` (default 15)** from a ticker started in `main.go`, which is what
catches a crash, a deploy, or an Expo outage.

### FR-5 — Device registration

`POST /kds/devices` with `{ name, station, pushToken, platform }`, upserting on `push_token`
(D17): a reinstall or an Expo token rotation updates the existing row rather than accumulating
dead ones, and `last_seen_at` is stamped on every call so a stale device is visible in the list.

`DELETE /kds/devices/{deviceId}` soft-deletes. The KDS app calls it on **Unregister** and on
**Log out** — a phone that logged out must stop receiving orders.

### FR-6 — The message payload

Built in `domain/kds_notification_entity.go` by a pure `BuildKdsPushMessage(transaction, station)`,
following the shape in *System Design Overview → The notification itself*. Pure and unit-tested,
for the same reason `buildOrderSlipPayload` is: the string is the product.

The body names the table for `source = 'order'` (via `transaction.Cart.Table.Label`, already
preloaded) and the customer name for everything else.

### FR-7 — The KDS app

Two screens, described in *System Design Overview → New app and its screens*. The behaviour worth
specifying is the permission flow, because it is where these apps fail:

`KdsDeviceRegisterUsecase` is a finite state machine like every other use case here:

```
idle → checkingPermission → permissionDenied
                          → permissionGranted → registering → registered
                                                            → registerError
```

- Permission is requested on an explicit tap, never on mount — an unexplained OS prompt at first
  launch is the single most common way to get permanently denied.
- `permissionDenied` renders instructions plus an **Open settings** action, because on both
  platforms a second request after a denial is a no-op.
- `registered` is the resting state, showing the device name and station, and offering **Send test
  notification** so the person setting the phone up gets an immediate, unambiguous confirmation
  rather than waiting for a real order.

All device-side APIs are behind `PushTokenRepository` (D13), so the use case and its tests never
touch `expo-notifications`.

---

## Design decisions

**D1 — Payment is the trigger, at the single shared `payTransaction`.**
`payTransaction` (`transaction_usecase.go:209`) is the only function through which a transaction
becomes paid, from either source. One call site covers POS, order and rental checkouts, and can
never be forgotten by a future payment path because there is only one. Payment is also the moment
the transaction becomes immutable (`transaction_usecase.go:107`), so what the barista is told is
what the guest is buying.
*Alternative rejected:* notifying at `CreateTransaction` (Option A) — an unpaid POS transaction can
still be edited or deleted, so it would summon the bar for orders that then change or vanish.

**D2 — Routing reuses `categories.station`; no new taxonomy is introduced.**
`BAR | KITCHEN | NONE` has existed since `000015_add_category_station`, is operator-editable, and
already routes work in this venue by cutting the printed slip in two. A notification-specific flag
would be a second copy of the same fact, free to drift.
*Alternative rejected:* a `notify_kitchen` boolean (Option E), and `sale_type` (Option F) — the
latter answers "is this rented" rather than "must this be made".

**D3 — A transaction with no `BAR` or `KITCHEN` item produces no notification, and this is the
general rule rather than a board-game special case.**
The acceptance criterion "don't notify for a board-game ticket" is satisfied because a ticket's
category is `NONE` (the column default), exactly as `buildOrderSlipPayload` already declines to
print a slip for such a transaction. No code anywhere mentions board games, so a new
non-preparable product — merchandise, a deposit, a voucher — is silent on the day it is created
without anyone touching this feature.

**D4 — Idempotency is `UNIQUE (transaction_id, station)` in the outbox, not application logic.**
The order app can observe a QRIS payment from two places (`ConfirmPayment` and
`refreshPendingPaymentStatus` both reach `applyQrisStatus`), and the dispatcher is at-least-once
by design. A unique key makes the duplicate impossible in the one place that cannot be bypassed.
Its deliberate second effect: unpay-then-repay does not notify twice.
*Alternative rejected:* a `notified_at` flag on `transactions` — one column cannot express *bar
told, kitchen not yet*, and it puts a KDS concern on the hottest table in the POS.

**D5 — Enqueue inside the payment's DB transaction; never call the push gateway inside it.**
The enqueue is a local insert with no network, so it is safe to make it atomic with the payment —
that atomicity is the entire value of the outbox. An HTTP call in the same place would hold row
locks across someone else's network and could roll back a payment that already succeeded at DOKU
(Option L).

**D6 — The dispatcher is an in-process goroutine ticker, not a second binary or a message queue.**
`apps/api` is one systemd-managed static binary on one VPS
([`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md)). A ticker plus a
post-commit kick is ~80 lines and needs no new deployment unit, no broker and no CI change. Redis
or a worker binary would be more infrastructure than the feature.
*Consequence, recorded honestly:* this assumes a single API instance. Two instances would both
sweep, and the unique key stops double *rows* but not double *sends*. If the API is ever scaled
horizontally, the claim step needs `SELECT … FOR UPDATE SKIP LOCKED`. Noted in Risks.

**D7 — Delivery is behind `KdsPushGatewayRepository`, mirroring `PaymentGatewayRepository`.**
`PaymentGatewayRepository` (`apps/api/domain/payment_repository.go`) with its `data/doku/`
implementation is the established pattern for a third-party integration here: the domain declares
the interface, one `data/` package speaks the vendor's protocol, and every test uses the generated
mock. `data/expopush/` follows it exactly, which is what makes moving to FCM (Option I) a
one-package change rather than a refactor. It is also how the acceptance criterion "no third-party
push API from the frontend" is enforced structurally: the token and the credentials exist only on
the server.

**D8 — Notifications target registered devices, not FCM topics.**
A topic (`/topics/bar`) would remove the `kds_devices` table, but it also removes every answer to
*which phones are registered, when did each last check in, and why did this one stop receiving?* —
which is the first thing anyone asks when a barista misses an order. Topics also cannot be
enumerated or revoked server-side, so a lost or stolen phone keeps receiving orders until someone
reinstalls the app on it.

**D9 — The notification's headline is the daily transaction number.**
`transactionNumber` ([`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md))
is already what the printed slip carries, what the guest's status page shows in the largest type
on screen, and what the barista calls out. Anything else — the row id, the pager number — would
introduce a second identifier for the same order. Required by the acceptance criteria and
independently correct.

**D10 — The KDS app authenticates with existing staff credentials and the existing JWT.**
`AuthUsecase.Login` issues the token, `registerAuthTokenInterceptor` /`getStoredAuthToken`
(`libs/ui/src/data/api/authToken.native.ts`) already attach and persist it on React Native, and
`CheckAuth` already guards every route this feature adds. A device-only auth scheme (a pairing
code, a long-lived device token) is a second credential system to build, rotate and revoke for no
capability this MVP needs.
*Consequence:* the notification cannot record *which* staff member is on the bar, because
`CheckAuth` validates the JWT and discards the claims without putting a user in the request
context — the same limitation `docs/prd-order-fulfillment-status.md` records for
`completed_by_user_id`. Not needed here; recorded so a KDS spec starts from it.

**D11 — `apps/kds-mobile` is a third app with its own import graph, `@gatherloop-pos/ui/kds`.**
`docs/trd-ui-presentation-split-by-app.md` made POS and order separate export surfaces precisely
so one app cannot reach into another's screens. A KDS that imported `@gatherloop-pos/ui/pos` would
pull the entire POS composition-root graph — every screen, handler and use case in the product —
into a two-screen app's bundle, and would make the next KDS screen free to import a POS one. The
cost is one `index.kds.ts`, one `tsconfig.base.json` path and one `.eslintrc.json` block, all
copied from the existing pair.

**D12 — The KDS app gets its own login screen rather than importing the POS one.**
`libs/ui/.eslintrc.json` bans cross-app imports of `screens/` and `handlers/`, and the alternative
— promoting the POS auth slice to a neutral shared folder — touches `apps/pos-web`,
`apps/pos-mobile`, their composition roots and their tests, to share a username/password form.
The shared part that matters (`AuthLoginUsecase`, `AuthRepository`, the token interceptor) lives
in `domain/` and `data/` and **is** shared, unchanged.
*Alternative kept open:* if a fourth consumer appears, promote the screen then, with three call
sites to prove the shape.

**D13 — `expo-notifications` is reached only through `PushTokenRepository`, implemented in
`data/native/`.**
Permission status, permission request and token acquisition are device capabilities, which makes
them a repository in this architecture, not a hook in a handler. Keeping them behind an interface
is what lets `kdsDeviceRegister.test.ts` drive the whole permission FSM — including the denied
branch — with `MockPushTokenRepository`, under a Jest config that stubs `react-native` wholesale
and could not load `expo-notifications` anyway.

**D14 — `apps/kds-mobile` is an Expo app, unlike `apps/pos-mobile`.**
Required by the acceptance criteria, and correct on the merits: `apps/pos-mobile` is bare React
Native with checked-in `android/` and `ios/` directories, and adding push there would mean
hand-editing Gradle, `AndroidManifest.xml`, `Info.plist` and the APNs capability. Expo's config
plugins do that from `app.json`, and EAS Build removes the "which machine can build the release"
question for a device nobody has a Mac next to. The workspace has `expo` and `@nx/expo`'s sibling
`@nx/react-native` already; this adds `@nx/expo`.
*Consequence:* two mobile toolchains in one repo until `apps/pos-mobile` is migrated, which this
PRD does not propose. See Risks.

**D15 — KDS copy is English.**
`views/screens/pos/**` is English and `views/screens/order/**` is Indonesian
(`docs/prd-order-fulfillment-status.md` D15). The KDS is a staff surface; it follows the POS.

**D16 — No queue, no ticket list, no acknowledgement, no bump in this PRD.**
Stated by the acceptance criteria, and structurally sound: the queue already exists as
`GET /transactions?fulfillment=preparing` and the bump already exists as
`PUT /transactions/{id}/complete` (`transaction_route.go`), both shipped by
`docs/prd-order-fulfillment-status.md`. The KDS view is a screen over endpoints that are already
there — which is exactly why it is a separate PRD rather than a blocker for this one.

**D17 — Registration upserts on `push_token`.**
Expo tokens rotate on reinstall and occasionally on OS update. Keying on the token means the
venue's three phones are three rows forever, instead of accumulating dead rows that the dispatcher
then pays to discover. `name` and `station` are updated in the same call, so re-registering is
also how a phone moves from the bar to the kitchen.

**D18 — Delivery failures retry five times, then stop; `DeviceNotRegistered` prunes the device.**
Five attempts over the sweeper interval spans about a minute — far longer than a transient Expo
error and far shorter than the useful life of a "new order" alert. A notification nobody received
in five minutes is not worth delivering; it is worth *seeing*, which is what `status = 'failed'`
and `last_error` are for. `DeviceNotRegistered` is Expo's definitive "this token is dead" receipt
and the only signal that justifies deleting a device the operator registered.

**D19 — No changes to the `Transaction` API contract.**
The notification is a server-side effect of payment. Nothing a client sends or receives changes,
which means no regeneration risk for `apps/pos-web`, `apps/order-web` or `apps/pos-mobile`, and no
new field for `libs/ui/src/__mocks__/api-contract.ts` on the transaction path.

---

## Phased plan

Each phase is one PR, leaves `main` green and is shippable on its own.

| # | Phase | Layer | Depends on |
| --- | --- | --- | --- |
| 1 | `kds_devices` + registration endpoints | API | — |
| 2 | Expo push gateway + test-notification endpoint | API | 1 |
| 3 | KDS domain slice: entities, repositories, use cases | libs/ui | 1, 2 |
| 4 | `@gatherloop-pos/ui/kds` graph: screens, handlers, composition roots | libs/ui | 3 |
| 5 | `apps/kds-mobile` Expo app — **first demo: the phone buzzes** | apps | 4 |
| 6 | `kds_notifications` outbox + the station rule | API | — |
| 7 | Enqueue on payment | API | 6 |
| 8 | Dispatcher + retries — **second demo: a real order buzzes** | API | 2, 7 |
| 9 | Docs site, deployment notes, e2e | docs | 5, 8 |

Phases 1–5 and phase 6 are independent; 6 can land in parallel with the frontend track. Phase 8 is
the one that turns the feature on.

> Every phase touching `libs/api-contract/src/api.yaml` regenerates both clients
> (`npx nx run api-contract:generate:go`, `npx nx run api-contract:generate:ts`) and may need the
> new symbol added to `libs/ui/src/__mocks__/api-contract.ts`, which Jest substitutes wholesale for
> the generated package.

### Phase 1 — `kds_devices` and registration endpoints (API)

Migration `000031_create_kds_devices` (next free number). `KdsDevice`, `KdsStation`, `KdsPlatform`
in `domain/kds_device_entity.go`; `KdsDeviceRepository` with the `//go:generate mockgen` directive;
`KdsDeviceUsecase` with register (upsert on `push_token`, D17), list and soft-delete, validating
that `station` is `BAR` or `KITCHEN` and returning `*domain.Error`; `data/mysql/kds_device_*.go`;
handler, transformer and the three routes under `CheckAuth`; `KdsDevice`/`KdsDeviceRequest`
schemas and the three operations in `api.yaml`; wiring in `main.go`. Mocks regenerated with
`go generate ./...`.

**Acceptance:** `kds_device_usecase_test.go` covers register, re-register with the same token
(one row, fields updated), an invalid station and delete; `kds_device_handler_test.go` covers the
three routes; `MIGRATIONS_DIR=data/mysql/migrations make migrate-up && make migrate-down` is clean
both ways; `npx nx run api:test` green.

### Phase 2 — Expo push gateway and the test-notification endpoint (API)

`KdsPushGatewayRepository` in `domain/kds_notification_repository.go` (`Send(ctx, []KdsPushMessage)
([]KdsPushReceipt, *Error)`), implemented in `data/expopush/kds_push_repo.go` against
`POST https://exp.host/--/api/v2/push/send` — structured exactly like `data/doku/`, with
`EXPO_PUSH_ACCESS_TOKEN` read in `utils/env.go` and documented in `.env.example`.
`POST /kds/devices/{deviceId}/test-notification` sends a fixed message to one device and surfaces
the gateway's receipt as a `domain.Error` on failure.

**Acceptance:** a repository test over an `httptest` server asserts the request body, headers and
receipt parsing, including a `DeviceNotRegistered` receipt; the use-case test asserts a failing
gateway maps to `BadGateway`; `npx nx run api:test` green. The endpoint cannot be exercised for
real until phase 5 provides a genuine token — that is phase 5's acceptance, not this one's.

### Phase 3 — KDS domain slice (libs/ui)

No UI. `KdsDevice.ts` (entity, `KdsStation`, `KdsDeviceForm`, zod schema); `KdsDeviceRepository`
and `PushTokenRepository` interfaces (D13); `data/api/kdsDevice.ts` + transformer;
`data/mock/kdsDevice.ts` and `data/mock/pushToken.ts` with `setShouldFail` and a settable
permission status; `KdsDeviceRegisterUsecase` and `KdsTestNotificationUsecase` as FSMs
(`extends Usecase<State, Action, Params>`, a pure `getNextState`, effects only in
`onStateChange`); barrel exports in every touched `index.ts`.

**Acceptance:** `kdsDeviceRegister.test.ts` drives granted, denied and register-error paths with
`UsecaseTester` + `flushPromises`; `kdsTestNotification.test.ts` covers success and failure;
`npx nx run ui:test` green; both use cases reachable from `@gatherloop-pos/ui`.

### Phase 4 — The `kds` presentation graph (libs/ui)

`libs/ui/src/index.kds.ts`, the `@gatherloop-pos/ui/kds` path in `tsconfig.base.json`, and the
`src/app/kds/**`, `src/presentation/handlers/kds/**` and `screens/kds` blocks in
`libs/ui/.eslintrc.json` mirroring the POS and order blocks — including the `react` ban on
`app/kds/**` and the cross-app patterns in both directions (the existing POS and order blocks each
gain `**/app/kds/**`, `**/screens/kds/**`, `**/handlers/kds/**`). Then `KdsLoginScreen` and
`KdsDeviceSetupScreen` with stories, `KdsDeviceSetupHandler`, and the `app/kds/` composition roots.

**Acceptance:** `npx nx run ui:lint` green — the real check, since it proves the new boundary is
enforced in both directions; Storybook shows the setup screen in its idle, denied, registering and
registered states; a handler test over `MockKdsDeviceRepository` + `MockPushTokenRepository`
asserts that granting permission then registering reaches the registered state and that a denied
permission renders the settings instructions; `npx nx run ui:test` green.

### Phase 5 — `apps/kds-mobile` (Expo)

`@nx/expo` added to the workspace; `apps/kds-mobile` generated with `app.json`, `eas.json`, a
`project.json` whose `start`/`run-android`/`run-ios` targets depend on `api-contract:generate:ts`
(copying `apps/pos-mobile/project.json`), `.env.example` with `API_BASE_URL`, `RootProvider` from
`@gatherloop-pos/provider`, a two-screen `@react-navigation/native-stack`, and
`ExpoPushTokenRepository` in `libs/ui/src/data/native/` — the one file importing
`expo-notifications` — creating the `orders` Android channel on launch.

**Acceptance:** `npx nx run kds-mobile:run-android` installs; logging in, granting permission,
registering as **Bar**, and tapping **Send test notification** produces a notification on the
device with sound, from a locked screen and with the app closed; `GET /kds/devices` shows one row;
**Unregister** removes it; `npm run lint` and `npm test` green across the workspace.

### Phase 6 — The outbox table and the station rule (API)

Migration `000032_create_kds_notifications`. `KdsNotification` and `KdsNotificationStatus`;
`StationsToNotify(Transaction) []KdsStation` in `domain/kds_notification_routing.go`;
`BuildKdsPushMessage(Transaction, KdsStation) KdsPushMessage` (FR-6);
`KdsNotificationRepository` (enqueue, claim pending, mark sent, mark failed) with its mysql
implementation and generated mock. **Nothing calls any of it yet** — this phase is the rule and
its storage, reviewed on its own.

**Acceptance:** `kds_notification_routing_test.go` covers every row of the FR-2 table, including
the two board-game cases and an item whose category station is empty; a message-building test
asserts the title carries `transactionNumber` (not the id) and that the body lists only the
station's own items; a repository test asserts a duplicate enqueue leaves one row;
`make migrate-up`/`make migrate-down` clean; `npx nx run api:test` green.

### Phase 7 — Enqueue on payment (API)

`payTransaction` (`transaction_usecase.go:209`) gains the `KdsNotificationRepository` parameter and
the `EnqueueForTransaction` call inside the existing `BeginTransaction` callback;
`TransactionUsecase` and `PaymentUsecase` gain the dependency and `main.go` passes it. Rows are
written and nothing dispatches them yet, so the observable behaviour is a growing `pending` table.

**Acceptance:** `transaction_usecase_test.go` asserts that paying a bar-only transaction enqueues
one `BAR` row, a mixed transaction enqueues two, and **a board-game-ticket-only transaction
enqueues none**; `payment_usecase_test.go` asserts the same for a QRIS confirmation and that
confirming twice still yields one row; every existing payment test still passes;
`npx nx run api:test` green.

### Phase 8 — The dispatcher (API)

`DispatchPending` per FR-4, the post-commit goroutine kick, and the `KDS_DISPATCH_INTERVAL_SECONDS`
ticker started in `main.go` with graceful shutdown. Structured logs on every send, failure and
device prune, using the existing `slog` setup.

**Acceptance:** use-case tests over the mock gateway cover success, a retryable failure
(`attempt_count` increments, row stays `pending`), exhaustion at five attempts (`failed`,
`last_error` set), `DeviceNotRegistered` (device soft-deleted), and a station with no registered
device (`sent`, warning logged). End to end on staging: a guest order paid by QRIS buzzes the bar
phone within five seconds; a POS sale of one board-game ticket buzzes nothing.
`npx nx run api:test` green.

### Phase 9 — Documentation and coverage

A `docs-site/` page under the sales section — what the KDS app is, how to set a phone up, how the
station on a category decides who gets notified, and what to do when a phone stops receiving —
plus its sidebar entry. `apps/api/.env.example` and `README.md` gain the two new variables and the
`apps/kds-mobile` entry in the project-structure block. A `pos-web-e2e` spec asserting that paying
a POS transaction whose only item is in a `NONE`-station category creates no `kds_notifications`
row, and one for a `BAR` item that does.

**Acceptance:** `npx nx run pos-web-e2e:e2e` passes locally — CI runs Playwright post-merge only
(`.github/workflows/e2e-main.yml`), so local is the gate; the docs page renders in
`npx nx run docs-site:dev`.

---

## Risks

**The phone is silent, on Do Not Disturb, or its battery optimiser killed the app.** The most
likely real-world failure, and not fully solvable in software. Mitigations: the Android `orders`
channel is created at `MAX` importance with sound and vibration; the setup screen surfaces
permission state explicitly; the **Send test notification** button exists so the failure is found
at setup rather than during service. Documented in phase 9: the KDS phone is a dedicated device,
plugged in, DND off, battery optimisation disabled for the app. iOS *critical alerts* (which
override the silent switch) need an Apple entitlement and are deliberately not pursued — an
Android device is the cheaper answer.

**Expo Push is a third party in the alerting path.** An Expo outage means no alerts. The outbox
makes this visible (`status = 'failed'`) and recoverable rather than silent, and D7's interface
keeps the FCM-direct migration to one package. The fallback during an outage is the status quo
ante: the printed slip and the POS list.

**`categories.station` is misconfigured.** A drinks category left at the `NONE` default is silent;
a board-game category set to `BAR` wakes the barista for a ticket — the exact thing the acceptance
criteria ask us to avoid. Mitigated by the same value already driving the printed slip, so an
error is very likely already known; and by the category list rendering `Station: …` on every row.
Worth a five-minute audit of every category before phase 8 goes live.

**A single API instance is assumed.** D6's sweeper has no cross-process claim. Two instances would
each pick up the same pending rows; the unique key prevents duplicate rows, not duplicate sends.
Current deployment is one systemd unit on one VPS. If that changes, the claim step needs
`SELECT … FOR UPDATE SKIP LOCKED` — a contained change, flagged here so it is not discovered by a
barista getting every order twice.

**Two mobile toolchains in one repo.** `apps/pos-mobile` stays bare React Native while
`apps/kds-mobile` is Expo (D14), so there are two build paths, two sets of native config and two
ways to be wrong about a dependency that patches native code. Bounded by `apps/kds-mobile` being a
two-screen app with one native dependency. Migrating `apps/pos-mobile` to Expo is a plausible
follow-up and explicitly not proposed here.

**Notification fatigue.** Every paid transaction with a preparable item buzzes a phone; at peak
that is a lot of buzzing, and a staff member who mutes the phone to cope has disabled the feature.
No mitigation in this PRD beyond the `NONE`-station filter. Worth watching after launch — per-item
batching or a quiet mode on the KDS view is the obvious follow-up, and belongs with the view.

**A dead token keeps a station silent.** If the bar phone's token rotates and nobody
re-registers, `GetKdsDevicesByStations` returns nothing and the dispatcher marks rows `sent` with
a warning. Mitigated by `last_seen_at` in the device list and by the app re-registering on every
launch; a POS-side "no KDS device registered for BAR" warning is the obvious follow-up and is
listed as deferred.

---

## Out of Scope

| Not doing | Why |
| --- | --- |
| **The KDS view** — ticket list, item detail, status, bump | Stated in the acceptance criteria. Its data is already served: `GET /transactions?fulfillment=preparing` is the queue and `PUT /transactions/{id}/complete` is the bump (`docs/prd-order-fulfillment-status.md`). Its own PRD. |
| **Acknowledging a notification** | Needs a ticket view to acknowledge from. The alert here is one-way. |
| **Per-item or per-station completion** | `docs/prd-order-fulfillment-status.md` D21 — one completion per order. Unchanged. |
| **Notifying on POS transaction creation** | D1, Option A. Reversible if the venue adopts open bills — see Open Question 1. |
| **Re-notifying after unpay → re-pay** | D4. The correction is to the money, not the drink. |
| **A POS screen for managing KDS devices** | The KDS app registers and unregisters itself. A device list in the POS is useful once there are more than three phones; `GET /kds/devices` already serves it. |
| **Notifying the cashier or the manager** | Only `BAR` and `KITCHEN` are stations. A `MANAGER` pseudo-station would be a different feature with a different rule. |
| **Sound customisation per station** | One channel, one sound. Two sounds is a setting nobody has asked for. |
| **Migrating `apps/pos-mobile` to Expo** | Out of scope and not blocking; see Risks. |
| **Recording which staff member is on the bar** | `CheckAuth` discards JWT claims (D10) — the same groundwork `docs/prd-order-fulfillment-status.md` identifies for `completed_by_user_id`. |
| **Web push to `apps/pos-web`** | A different transport with a different permission model, for a surface that is already staffed by someone looking at it. |

---

## Open Questions

1. **Does the venue ever run an open bill** — order first, pay at the end? If so, D1 notifies too
   late for those, and the answer is an explicit *Send to Kitchen* action on the unpaid
   transaction (Option C) **in addition to** the payment trigger, not instead of it. Assumed no.
2. **Should the bar and the kitchen share one phone?** The design allows it — register the same
   device twice with different names is *not* possible (D17 keys on the token), so a shared phone
   would need one station and would miss the other's orders. If a shared device is wanted, the
   device row needs a set of stations rather than one. Assumed one phone per station.
3. **Should a notification fire for a transaction paid outside service hours** (a late
   reconciliation, a cashier paying yesterday's open transaction)? Currently yes, and it would
   buzz a phone at midnight. A "don't dispatch rows older than N minutes" rule in the dispatcher is
   a three-line addition if it turns out to matter.
4. **How loud is loud enough?** The default notification sound may not carry over a grinder. A
   custom sound file is an Expo config-plugin change and an asset; deferred until someone stands in
   the kitchen and reports.
5. **Should the printed slip stop being manual once this ships?** Auto-printing on payment is the
   natural companion and shares the same trigger and the same station rule — but printing is a
   client-side capability (`usePrinter`, `libs/ui/src/utils/print.ts`), so it is a POS change, not
   a server one. Deliberately not bundled.

---

## Success Criteria

1. A guest pays by QRIS at a table and the bar phone buzzes within five seconds, with the app
   closed and the screen locked, showing the transaction number.
2. A cashier sells one board-game ticket and nothing buzzes — with no code anywhere mentioning
   board games.
3. A transaction with a coffee and a sandwich produces two notifications: one to the bar listing
   the coffee, one to the kitchen listing the sandwich.
4. Setting up a new phone takes one person under two minutes: install, log in, pick a station,
   grant permission, tap **Send test notification**, see it arrive.
5. When a barista reports a missed order, `SELECT * FROM kds_notifications WHERE transaction_id = ?`
   answers whether it was enqueued, attempted and delivered, and `last_error` says why not.
6. No frontend in this repo holds a push-provider credential or calls a push provider directly.
7. Payment behaviour is unchanged: every existing `transaction_usecase_test.go` and
   `payment_usecase_test.go` case passes untouched, and a push-gateway outage cannot fail or roll
   back a payment.
8. The next PRD can build the KDS view with no migration and no new endpoint — the queue, the
   routing and the bump are all already served.

---

## Sources

- Expo — Push Notifications overview, `expo-notifications`, and the Expo Push API including
  `DeviceNotRegistered` receipts: https://docs.expo.dev/push-notifications/overview/
- Expo — sending notifications from a server:
  https://docs.expo.dev/push-notifications/sending-notifications/
- Firebase Cloud Messaging HTTP v1 API (the Option I alternative):
  https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Android — notification channels and importance levels:
  https://developer.android.com/develop/ui/views/notifications/channels
- Apple — Critical Alerts entitlement, and why it is not pursued:
  https://developer.apple.com/documentation/usernotifications/unnotificationsound/critical-sounds
- Toast Kitchen Display System — station routing and new-ticket alerting:
  https://pos.toasttab.com/products/kitchen-display-system
- Square KDS — per-station ticket routing and new-order sounds:
  https://squareup.com/help/us/en/article/6595-square-kds
- Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
