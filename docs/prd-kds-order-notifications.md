# PRD: KDS Push Notifications — Telling the Barista and the Kitchen an Order Arrived

**Status:** Draft for review — revised twice, see below
**Scope:** a new React Native (Expo) app, `apps/kds-mobile`, and the backend that pushes a
notification to it when a transaction is paid. **Display of the order queue is explicitly not in
this PRD** — this is the notification pipe and nothing else.

---

## Revision note (first review pass)

The five open questions were answered in review. Four of the answers change the design, and all
four are recorded as new decisions rather than edited into the originals.

1. **A phone subscribes to a *set* of stations, not one station.** The first draft gave
   `kds_devices` a single `station` column and assumed one phone per station. The venue is two
   staff with a phone each who *usually* split bar and kitchen but sometimes both work the bar —
   so a fixed one-to-one mapping is wrong at exactly the moments it matters. **D20** replaces the
   column with a `kds_device_stations` join table and makes the setup screen a pair of checkboxes.

2. **A notification is never dropped for lack of a subscriber.** This is the real hole the answer
   to question 2 exposed, and it was worse than the mapping: with both staff subscribed to `BAR`,
   a food order would have found zero `KITCHEN` devices and the dispatcher would have marked the
   row `sent` with a log line nobody reads. **D21** makes an unsubscribed station broadcast to
   every registered device instead. That single rule is also what makes the "both on the bar"
   arrangement work with no configuration change: kitchen orders simply reach both phones.

3. **A transaction paid on a later business day does not notify.** **D22**, using the business-day
   definition already fixed by
   [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md) D6 rather than
   inventing a second one. The outbox records the skip instead of staying silent about it, which
   is why `kds_notifications.last_error` is renamed `detail` and `skipped` joins the status enum.

4. **The push message carries an explicit sound name, and the Android channel id is versioned.**
   A custom sound is wanted later, and an Android channel's sound is immutable after creation —
   so shipping `orders-v1` and a server-supplied sound field now costs nothing and avoids a
   migration-shaped problem later. **D23.**

The fifth answer — no open bills — confirms D1 as written and closes question 1 with no change.
Phase count is unchanged; phases 1, 6, 7 and 8 each gain a paragraph.

## Revision note (second review pass)

One change, and it is a deletion: **one paid transaction produces one notification, delivered to
every registered device.** **D24 supersedes D20 and D21.**

The first pass built per-device station subscriptions (D20) and then, one decision later, had to
add a rule that throws them away whenever a station has no subscriber (D21). That pairing was the
tell. D21 conceded that broadcasting to every phone is an acceptable outcome at this venue; D20
then existed only to *prevent* that acceptable outcome, in exchange for configuration that two
staff who swap roles mid-shift have to keep correct. A mechanism whose failure mode is "we do the
simple thing instead" is a mechanism that should have been the simple thing.

What this removes: the `kds_device_stations` table, the `station` column and its place in the
outbox's unique key, the station checkboxes on the setup screen, `KdsStation` from the API
contract entirely, and the whole device-resolution branch in the dispatcher.

What it keeps, unchanged: the station rule. `categories.station` still decides **whether** a
transaction notifies at all — that is the board-game exclusion (D3) and it is untouched — and it
still labels the items in the message body, so the barista and the cook each read their own line
off one alert. The station stopped being a routing key; it never stopped being the thing that
sorts the work.

The cost is stated in D24 and in Risks: a staff member is now buzzed for orders they are not
making. Phase count is unchanged; phases 1, 3, 4, 5, 6 and 8 all get smaller.

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
  rarely does (Settled in review, 1), and the escape hatch is small and additive.

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
- ✅ Idempotent by schema: `UNIQUE (transaction_id)` (D4).
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
                            ├─ ShouldNotify(transaction)
                            │     any item whose variant.product.category.station
                            │     is BAR or KITCHEN; none ⇒ nothing enqueued
                            ├─ paid on a later business day? ⇒ row written 'skipped'
                            └─ INSERT kds_notifications (transaction_id)   ← one row
                     │
                  COMMIT
                     │
                     ▼
        dispatch now (goroutine)  ◄── every 15s, sweeper picks up stragglers
                     │
                     ├─ one message, built once, per registered device (D24)
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
  name        VARCHAR(255) NOT NULL,          -- "Andi's phone", "Counter tablet"
  push_token  VARCHAR(255) NOT NULL,          -- ExponentPushToken[...]
  platform    VARCHAR(20)  NOT NULL,          -- 'ios' | 'android'
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP   NULL,
  deleted_at  TIMESTAMP    NULL,
  UNIQUE KEY uq_kds_devices_push_token (push_token)
);

-- 000032_create_kds_notifications.up.sql
CREATE TABLE kds_notifications (
  id             BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT      NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | sent | failed | skipped
  attempt_count  INT         NOT NULL DEFAULT 0,
  detail         TEXT        NULL,            -- last delivery error, or why it was skipped
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at        TIMESTAMP   NULL,
  UNIQUE KEY uq_kds_notifications_transaction (transaction_id),
  KEY idx_kds_notifications_status (status, created_at)
);
```

Two tables, and no station anywhere in either of them (D24). The station survives only inside the
domain — as the predicate that decides whether a row is written at all, and as a label in the
message body.

`kds_notifications` stores **no copy of the message**. The dispatcher re-reads the transaction by
id and builds the payload at send time; a paid transaction cannot be edited
(`transaction_usecase.go:107`), so there is nothing to snapshot against.

Neither table takes a foreign key, matching every other table in this schema.

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

Contract additions in `libs/api-contract/src/api.yaml`: `KdsDevice`, `KdsDeviceRequest`, and the
four operations. **No station type crosses the API boundary at all** (D24) — a device is a name, a
token and a platform. Nothing on the `Transaction` schema changes — the notification is a side effect of payment, not a field on it.

### New backend files

| Layer | File | Contents |
| --- | --- | --- |
| Entity | `domain/kds_device_entity.go` | `KdsDevice`, `KdsPlatform` |
| Entity | `domain/kds_notification_entity.go` | `KdsNotification`, `KdsNotificationStatus`, `KdsPushMessage`, `KdsStation` |
| Rule | `domain/kds_notification_routing.go` | `ShouldNotify(Transaction) bool` and `StationLines(Transaction) []KdsStationLine` — pure, no I/O |
| Repo iface | `domain/kds_device_repository.go` | CRUD + `GetKdsDevices` (every registered device — the only delivery target) |
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
goroutine), `utils/env.go` (`EXPO_PUSH_ACCESS_TOKEN`, `KDS_DISPATCH_INTERVAL_SECONDS`,
`KDS_PUSH_SOUND`).

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
| **Device Setup** | Device name field; notification-permission status with a *Grant permission* action; **Register this device**; **Send test notification**; and a *Registered as "Andi's phone"* confirmation state. Plus **Unregister** and **Log out**. |

There is nothing to configure beyond a name (D24). A staff member moving from the kitchen to the
bar does not touch this app, because the app has no opinion about which station they are on — the
notification tells them what arrived and they sort it out between themselves, which is what they
already do.

After registering, the app's job is to be open (or closed — push does not care) on a phone on the
counter. There is no queue, no ticket list and no bump button; that is the next PRD.

### The notification itself

```
┌────────────────────────────────────────────────────────────┐
│  New order #12 — Table 4                                   │
│  BAR: 2× Kopi Susu Gula Aren, 1× Americano ·               │
│  KITCHEN: 1× Sandwich                                      │
└────────────────────────────────────────────────────────────┘
```

One notification per paid transaction, identical on every phone (D24).

- **Title:** `New order #{transactionNumber} — {table label or customer name}` — the daily
  transaction number from
  [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md), which is the number
  printed on the slip and shown on the guest's phone, and therefore the one thing every surface
  already agrees on.
- **Body:** the items, **grouped under a station label**, stations in a fixed order (`BAR`, then
  `KITCHEN`), joined by `·`, and only stations actually present appear. This is the whole point of
  keeping `station` after D24: the split that used to be two notifications is now two labels, and
  each staff member reads the line that is theirs. Written as one line so it survives the collapsed
  notification as well as the expanded one, and truncated to four items plus `+N more`.
  A single-station order still carries its label — `BAR: 2× Kopi Susu` — because *"not mine"* is
  information too. Items are grouped by product name, not by variant: an order with one iced and
  one hot Coffee Latte reads `2× Coffee Latte`, not two separate lines, since the variant name
  isn't shown and showing it would make the line unreadable.
- **Data payload:** `{"transactionId": 123, "transactionNumber": 12, "stations": ["BAR",
  "KITCHEN"], "source": "order"}` — carried so the future KDS view can deep-link to the ticket
  without any contract change.
- **Sound:** the message carries an explicit sound name, from `KDS_PUSH_SOUND` (default
  `default`), rather than relying on the platform default (D23).
- **Priority:** `high`, always — the only value a KDS push is ever sent at. Expo's default
  priority maps to FCM `normal` and APNs priority 5, which the OS holds back while the phone is
  dozing and flushes when the screen comes back on. A locked counter phone is the *normal* state
  for this feature, not an edge case (D26).
- **Android:** channel id `orders-v1`, importance `MAX`, sound, vibration — created by the app on
  first launch so the alert is audible in a noisy room. The id is versioned because a channel's
  sound cannot be changed after creation (D23).
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

### FR-2 — The station rule decides whether anyone is woken

Two pure functions in `domain/kds_notification_routing.go`, no I/O, one `_test.go`:

```go
func ShouldNotify(transaction Transaction) bool        // is this worth an alert at all?
func StationLines(transaction Transaction) []KdsStationLine  // the FR-6 body, grouped
```

Both read `item.Variant.Product.Category.Station` across `transaction.TransactionItems` — already
preloaded on the entity the trigger holds (`apps/api/data/mysql/transaction_repo.go:118` preloads
`TransactionItems.Variant.Product.Category`). `NONE`, empty and any unrecognised value are
ignored; the remaining items group under `BAR` then `KITCHEN`, in that fixed order. Within a
station, items are further grouped by product name and summed — two variants of the same product
(e.g. iced/hot Coffee Latte) collapse into one `2× Coffee Latte` line instead of two, since the
body never shows the variant name.
`ShouldNotify` is exactly `len(StationLines(t)) > 0`, which is the property that keeps the
predicate and the message from ever disagreeing.

| Transaction | Stations present | Result |
| --- | --- | --- |
| 2 coffees | `[BAR]` | **one** notification to every device, body `BAR: …` |
| 1 coffee + 1 sandwich | `[BAR, KITCHEN]` | **one** notification to every device, body `BAR: … · KITCHEN: …` |
| 1 board-game ticket | `[]` | **no notification at all** |
| 1 board-game ticket + 1 coffee | `[BAR]` | one notification, listing the coffee only |
| a rental checkout (`RentalUsecase.CheckoutRentals`, paid later at the register) | `[]` | **no notification** |

The board-game exclusion is therefore not a special case in the code — it is what the general
rule does, because a ticket's category is `NONE`. This is the same predicate
`buildOrderSlipPayload` (`libs/ui/src/utils/print.ts`) uses to decide there is no slip worth
printing, so notification and printing agree by construction (D2, D3).

### FR-3 — The outbox

`EnqueueForTransaction` inserts **one** `kds_notifications` row when `ShouldNotify` is true,
`status = 'pending'` (D24). `UNIQUE (transaction_id)` makes it idempotent: the insert uses
`INSERT … ON DUPLICATE KEY UPDATE id = id`, so a duplicate enqueue is a no-op rather than an
error (D4).

**A transaction paid on a later business day is enqueued as `skipped`**, with `detail` recording
why, and is never dispatched (D22). The business day is the one
[`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md) D6 already fixes — the
calendar day of `created_at` in the API host's local timezone, boundary at midnight — so the
comparison is `createdAt.Format("2006-01-02") != now.Format("2006-01-02")`. Writing the row rather
than skipping the insert keeps FR-3's promise that the outbox answers *what happened to this
order's notification* for every paid transaction, including the ones deliberately left alone.

Consequences worth stating plainly:

- A payment observed twice (DOKU notify and the guest's status poll racing) notifies once.
- **Unpay followed by re-pay does not re-notify.** The bar was already told about order #12 and
  the correction is to the money, not to the drink. If the venue ever wants the opposite, it is a
  `DELETE` in `UnpayTransaction` and one line of reasoning to change (D4).

### FR-4 — The dispatcher

`KdsNotificationUsecase.DispatchPending(ctx)`:

1. Claim up to 50 rows with `status = 'pending'` and `attempt_count < 5`, oldest first.
2. Load each row's transaction and build its FR-6 message **once** (D24).
3. Fan that one message out to every registered device — `GetKdsDevices(ctx)`, not soft-deleted.
   If there are none, `status = 'skipped'`, `detail = 'no registered devices'`: there is nobody to
   tell, and retrying does not create a phone.
4. `KdsPushGatewayRepository.Send(ctx, messages)` — one batched call.
5. Per-token results decide the row's fate. **At least one device accepted → `status = 'sent'`,
   `sent_at = now()`**, with any per-token failures recorded in `detail`. **No device accepted →**
   `attempt_count++`, `detail` set, back to `pending`; at 5 attempts it becomes `failed` and stops.
   `DeviceNotRegistered` soft-deletes that device (D18).

   The one-accepted-is-sent rule follows directly from D24: every phone now carries the *same*
   message, so one delivered phone means the venue was told. Retrying because the second phone's
   token failed would re-buzz the first phone with a duplicate of an alert somebody already acted
   on — trading a real annoyance for a redundant one.

It runs in two ways, which is the standard outbox shape: **immediately after the payment commits**
(a goroutine, so the cashier's HTTP response is not waiting on Expo), and **every
`KDS_DISPATCH_INTERVAL_SECONDS` (default 15)** from a ticker started in `main.go`, which is what
catches a crash, a deploy, or an Expo outage.

### FR-5 — Device registration

`POST /kds/devices` with `{ name, pushToken, platform }`, upserting on `push_token` (D17): a
reinstall or an Expo token rotation updates the existing row rather than accumulating dead ones,
and `last_seen_at` is stamped on every call so a stale device is visible in the list. There is
nothing else to send — a device is a name, a token and a platform (D24).

`DELETE /kds/devices/{deviceId}` soft-deletes. The KDS app calls it on **Unregister** and on
**Log out** — a phone that logged out must stop receiving orders.

### FR-6 — The message payload

Built in `domain/kds_notification_entity.go` by a pure
`BuildKdsPushMessage(transaction, sound string)`, over `StationLines` (FR-2) and following the
shape in *System Design Overview → The notification itself*. Pure and unit-tested, for the same
reason `buildOrderSlipPayload` is: the string is the product — and after D24 it is the *only*
place the station split is expressed to a human, which raises the stakes on getting it readable.

The title names the table for `source = 'order'` (via `transaction.Cart.Table.Label`, already
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
- `registered` is the resting state, showing the device name, and offering **Send test
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

**D4 — Idempotency is `UNIQUE (transaction_id)` in the outbox, not application logic.**
*Narrowed by D24 — the key was `(transaction_id, station)` while a transaction produced one row
per station. The reasoning is unchanged and the guarantee is now simply stronger.*
The order app can observe a QRIS payment from two places (`ConfirmPayment` and
`refreshPendingPaymentStatus` both reach `applyQrisStatus`), and the dispatcher is at-least-once
by design. A unique key makes the duplicate impossible in the one place that cannot be bypassed.
Its deliberate second effect: unpay-then-repay does not notify twice.
*Alternative rejected:* a `notified_at` flag on `transactions` — it puts a KDS concern on the
hottest table in the POS, and it records only *that* a notification happened, not the attempts,
failures and skips that make the outbox answerable when a barista says they never got it.
*(Before D24 this decision carried a second argument — one flag cannot say "bar told, kitchen not
yet". With one notification per transaction that argument no longer applies, and the two above
are what the decision now rests on.)*

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
A single topic (`/topics/kds`) would be an exact fit for D24's fan-out and would remove the
`kds_devices` table entirely — which is precisely why it is worth restating here rather than
treating as settled. It also removes every answer to
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

**D14 — `apps/kds-mobile` uses Expo's managed native config; `apps/pos-mobile` keeps its checked-in
one.**
*Corrected during review — an earlier draft called this "two mobile toolchains", which overstates
it.* **`apps/pos-mobile` is already an Expo-modules app.** Its
`android/settings.gradle:6-7` resolves `expo/package.json` and calls `useExpoModules()`, its
`MainApplication.kt:14-15` imports `expo.modules.ApplicationLifecycleDispatcher` and
`ReactNativeHostWrapper`, and its `ios/Podfile` calls `use_expo_modules!`. The root
`package.json` already carries `expo ~51.0.39`, `expo-modules-core` and `expo-linear-gradient`.

So this PRD does not introduce Expo to the repo. The only difference between the two apps is
**where the native config lives**: `apps/pos-mobile` has checked-in `android/` and `ios/`
directories, while `apps/kds-mobile` generates them from `app.json` via prebuild (CNG) and builds
on EAS. That matters for push specifically, because `expo-notifications`' config plugin writes the
`AndroidManifest.xml` entries, the APNs entitlement and the custom-sound assets (D23) that would
otherwise be hand-edited into two committed native trees.

Adding `expo-notifications` is therefore one more autolinked Expo module in a project that already
autolinks them — install it with `npx expo install` so the SDK-51-compatible version is picked,
not the latest.
*Consequence:* see D25, which is the real constraint this creates.

**D25 — The two mobile apps share one hoisted `react-native` and one `expo`, and must move
together.**
The repo has **no npm workspaces** (root `package.json` has no `workspaces` key) and no per-app
lockfile: `apps/pos-mobile/package.json` lists its dependencies as `"*"` and every version is
resolved once at the root. `package-lock.json` pins exactly one `react-native@0.74.1`, one
`expo@51.0.39` and one `react@18.2.0`, and both apps' Metro builds resolve to those copies.

Today that is a *benefit* — Expo SDK 51's default pairing is React Native 0.74, which is exactly
what is installed, so `apps/kds-mobile` needs no version change at all and cannot drift from
`apps/pos-mobile`.

The constraint is the other direction: **a future Expo SDK bump for the KDS app is a React Native
bump for the POS app.** SDK 52 moves to RN 0.76, and there is no way to hold `apps/pos-mobile`
back without introducing workspaces or a second lockfile. Anyone upgrading the KDS app later is
upgrading both, and should plan a `pos-mobile` regression pass into that work.
*Recorded rather than solved:* adding npm workspaces to decouple them is a repo-wide change well
outside a notification feature, and nothing in this PRD needs it.

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
then pays to discover. `name` and the station set are updated in the same call, so re-registering
is also how a phone moves from the bar to the kitchen, or picks up both (D20).

**D18 — Delivery failures retry five times, then stop; `DeviceNotRegistered` prunes the device.**
Five attempts at the 15-second sweeper interval spans about a minute — far longer than a transient
Expo error and far shorter than the useful life of a "new order" alert. A notification nobody
received in a minute is not worth retrying; it is worth *seeing*, which is what `status = 'failed'`
and `detail` are for. `DeviceNotRegistered` is Expo's definitive "this token is dead" receipt
and the only signal that justifies deleting a device the operator registered.

**D19 — No changes to the `Transaction` API contract.**
The notification is a server-side effect of payment. Nothing a client sends or receives changes,
which means no regeneration risk for `apps/pos-web`, `apps/order-web` or `apps/pos-mobile`, and no
new field for `libs/ui/src/__mocks__/api-contract.ts` on the transaction path.

**D20 — ~~A device subscribes to a *set* of stations, held in `kds_device_stations`~~. Superseded
by D24** — one notification per transaction, to every device, so there is nothing to subscribe to.
Retained below for the reasoning, and because its own last paragraph is the argument D24 had to
answer.
*Replaced the single `station` column on `kds_devices` in the first draft.* The venue is two staff
with a phone each: usually one on the bar and one in the kitchen, sometimes both on the bar. A
one-station-per-device column cannot express "this phone covers both", which is the arrangement
during every quiet period and every time one of them steps away — and a phone that covers one
station is a phone that is deaf to the other one's orders. A join table also keeps the enum open:
a third station is a row, not a schema change.
*Alternative rejected:* two boolean columns (`notify_bar`, `notify_kitchen`) — fewer joins, but
they hard-code the station list into the schema, and the station list lives in `categories.station`
where the operator can already extend it.
*Alternative rejected:* dropping per-device stations entirely and sending every notification to
every phone. Tempting at two staff, and it is what D21 falls back to — but they *do* split the
work most of the time, and a kitchen phone buzzing for every drink during a rush is how a staff
member arrives at muting the phone, which disables the feature silently.

**D21 — ~~A station with no subscribed device broadcasts to every registered device~~. Superseded
by D24** — broadcasting is no longer the exception, it is the rule, so the fallback has nothing
left to fall back from. The reasoning below is the reason D24 is safe.
This was the rule that made D20 safe. Both staff on the bar means zero `KITCHEN` subscribers, and
the first draft would have marked that food order `sent` after telling nobody — a silent miss,
which is strictly worse than the status quo the feature replaces, because staff would have stopped
watching the POS by then. Broadcasting is the correct read of the situation: if nobody claims the
kitchen, everybody is the kitchen. The station is in the notification title either way, so a
recipient who is not covering it still knows what arrived and who should take it.
It also removes the need for any "is a station uncovered?" monitoring, warning banner or nag —
the uncovered case degrades into the merely-noisier case instead of the silent one.
*Alternative rejected:* a POS warning when a station has no device — nobody is looking at the POS;
that is the premise of this PRD.

**D22 — A transaction paid on a later business day is recorded as `skipped`, never dispatched.**
A cashier settling yesterday's open transaction this morning should not summon the bar, and the
notification would be actively misleading beyond being useless: the headline is the *daily*
transaction number (D9), so yesterday's `#12` and today's `#12` are two different orders, and the
staff member reading the alert has no way to tell which one they were handed. The boundary is the
one [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md) D6 already fixed —
calendar day of `created_at`, host-local, midnight — because two definitions of "the business day"
in one codebase is a bug waiting for the first late-night shift.
*Alternative rejected:* an age threshold in minutes (`don't dispatch rows older than N`). It needs
a number picked and tuned, and it answers a different question — a slow dispatcher, not a late
settlement. The sweeper's own retry limit (D18) already bounds that case.

**D23 — The push message carries an explicit sound name, and the Android channel id is versioned.**
A custom sound is wanted, later. Three things make "later" expensive if they are not decided now.

**An Android notification channel's sound is fixed at creation.** Android's own documentation is
explicit: *"After you create a notification channel, you can't change the notification behaviors.
The user has complete control at that point. However, you can still change a channel's name and
description."* Importance, sound, vibration and lights are all in the frozen set. A venue that has
already installed the app therefore keeps the original sound forever unless the app creates a
**new channel id** — hence `orders-v1` from day one, and `orders-v2` when the sound changes.

**The sound has to be set in two places to work on every Android version.** On Android 8+ the
*channel* carries it; below 8 the *notification* carries it. The message therefore always sends
both `channelId` and `sound`, which is also what iOS needs, since on iOS the filename travels in
the payload and nothing else.

**The file must be `.wav`.** It is the one format both platforms accept, and it is bundled through
the `expo-notifications` config plugin's `sounds` array, which makes it available to both the
channel definition and the message.

`KDS_PUSH_SOUND` (default `default`) is therefore a `.wav` filename with no directory, and the
later change is: add the asset to the plugin's `sounds` array, bump the channel id, set the env
variable. No migration, no contract change, no reinstall instructions.

**D24 — One paid transaction produces one notification, delivered to every registered device.**
*Supersedes D20 and D21.* D20 gave each phone a station subscription; D21 then threw that
subscription away whenever a station had no subscriber. The pair was self-undermining: D21
established that broadcasting to every phone is an acceptable outcome here, which leaves D20
spending a join table, a contract type, two checkboxes and a re-registration ritual purely to
*avoid* an outcome already agreed to be acceptable. At two staff sharing two stations, the
subscription is configuration that has to be corrected every time they swap roles, and D21 means
getting it wrong was never punished — so it was configuration nobody would maintain, protecting
against a cost nobody had measured.

Collapsing to one notification deletes `kds_device_stations`, the `station` column and its place
in the outbox's unique key, the station checkboxes, `KdsStation` from the API contract, and the
dispatcher's whole device-resolution branch. It also makes the "who is covering the kitchen
tonight" question disappear rather than be answered.

**The station is not lost, it moved.** It still decides *whether* anything is sent (D3, the
board-game exclusion, untouched) and it still groups the items in the body, so one alert carries
both stations' work under their own labels. Two notifications became two labels.

*The cost, stated plainly:* a staff member is buzzed for orders they are not making — the exact
thing D20's last paragraph warned about, and the reason this is a decision rather than an
obvious win. It is accepted because the venue is two people within earshot who already split the
work by talking; because a mixed order now costs *one* push per phone instead of two, so the
common case gets quieter, not louder; and because the failure mode it removes (a silently
unwatched station) is unrecoverable while the one it accepts (an extra buzz) is merely annoying.

*Reversible, and cheaply:* if the venue grows to genuinely separate rooms and the noise becomes
real, per-station delivery returns as a nullable `station` on `kds_notifications` plus a
subscription table, with historical rows left `NULL` meaning "sent to everyone" — which is exactly
true of them, not an approximation. That is the same cost as building it now, paid only if needed.
*Alternative rejected:* keeping the subscription table but defaulting every device to both
stations — it is D24's behaviour with D20's machinery still in the schema, and a knob nobody turns
is a knob that misleads the next reader into thinking somebody does.

**D26 — Every KDS push is sent at `priority: high`, and there is no other value.**
*Added after the first release: the first pass omitted `priority` entirely, and the bug it caused
is the one this whole PRD exists to prevent.* With the field absent, Expo defaults to
`priority: 'default'`, which becomes FCM `normal` on Android and `apns-priority: 5` on iOS. Both
platforms treat that as *deliverable whenever convenient*: Android holds normal-priority messages
for the duration of Doze, iOS batches priority-5 pushes to conserve power. The observed symptom
was exact — a barista locking the phone got nothing, and every held order arrived at once the
moment the screen came back on.

**High priority is not a tuning knob here, it is the delivery mechanism.** Expo Push sends to FCM
as a *data* message, which `expo-notifications`' own messaging service turns into the notification
the barista sees. Waking the app is therefore a precondition for the notification existing at all,
and a normal-priority data message in Doze does not wake anything. FCM documents high priority as
the mode that wakes a sleeping device; APNs priority 10 as the mode that delivers immediately.

**It is set in the domain, not in the gateway**, next to `Sound` and `ChannelId` — the message
shape is already a domain concern (FR-6), and `BuildKdsPushMessage` is where a test can assert it.
`KdsPushPriorityHigh` is a single exported constant with both construction sites — the dispatched
order and the setup screen's **Send test notification** — pointing at it, because a test
notification that behaves differently from a real one tests nothing worth knowing.

*No env variable, no per-message choice.* A low-priority order notification is a contradiction:
every message this feature sends is the one thing its recipient is waiting for. The knob would
only ever be set wrong.

*What this does not fix:* Android can still downgrade high-priority FCM for an app in the
`restricted` App Standby bucket, and a battery optimiser can still kill the app outright. Those
are device settings, not payload fields — see Risks, and the setup instructions in
`docs-site/sales/kds.md`, which is why the dedicated-phone guidance exists.

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

Migration `000031_create_kds_devices` (next free number). `KdsDevice` and `KdsPlatform` in
`domain/kds_device_entity.go`; `KdsDeviceRepository` with the `//go:generate mockgen` directive;
`KdsDeviceUsecase` with register (upsert on `push_token` — D17), list and soft-delete, returning
`*domain.Error`; `data/mysql/kds_device_*.go`; handler, transformer and the three routes under
`CheckAuth`; `KdsDevice`/`KdsDeviceRequest` schemas and the three operations in `api.yaml`; wiring
in `main.go`. Mocks regenerated with `go generate ./...`. No station appears anywhere in this
phase (D24).

**Acceptance:** `kds_device_usecase_test.go` covers register, re-register with the same token (one
row, fields updated), a missing name or token, and delete; `kds_device_handler_test.go` covers the
three routes; `MIGRATIONS_DIR=data/mysql/migrations make migrate-up && make migrate-down` is clean
both ways; `npx nx run api:test` green.

### Phase 2 — Expo push gateway and the test-notification endpoint (API)

`KdsPushGatewayRepository` in `domain/kds_notification_repository.go` (`Send(ctx, []KdsPushMessage)
([]KdsPushReceipt, *Error)`), implemented in `data/expopush/kds_push_repo.go` against
`POST https://exp.host/--/api/v2/push/send` — structured exactly like `data/doku/`, with
`EXPO_PUSH_ACCESS_TOKEN` and `KDS_PUSH_SOUND` read in `utils/env.go` and documented in
`.env.example`.
`POST /kds/devices/{deviceId}/test-notification` sends a fixed message to one device and surfaces
the gateway's receipt as a `domain.Error` on failure.

**Acceptance:** a repository test over an `httptest` server asserts the request body, headers and
receipt parsing, including a `DeviceNotRegistered` receipt; the use-case test asserts a failing
gateway maps to `BadGateway`; `npx nx run api:test` green. The endpoint cannot be exercised for
real until phase 5 provides a genuine token — that is phase 5's acceptance, not this one's.

### Phase 3 — KDS domain slice (libs/ui)

No UI. `KdsDevice.ts` (entity, `KdsDeviceForm` — a name and nothing else, D24, with its zod
schema); `KdsDeviceRepository`
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
asserts that granting permission then registering reaches the registered state, and that a denied
permission renders the settings instructions; `npx nx run ui:test` green.

### Phase 5 — `apps/kds-mobile` (Expo)

**Prerequisites that are procurement, not code, and should be started before the phase:**

| Platform | Needed | Note |
| --- | --- | --- |
| Android | FCM V1 credentials (a Firebase project, `google-services.json`, the service-account key uploaded to EAS) | Required for any real build. Free. |
| iOS | A **paid** Apple Developer account (~$99/yr) for the APNs key | There is no way around it; APNs credentials cannot be issued without one. |

If the Apple account is not in place, **ship Android first** — nothing in this PRD is
platform-specific, and the iOS build is additive whenever the account exists. A dev or production
build is required either way: push is not a thing to validate in Expo Go, which uses Expo's own
credentials on this SDK and drops the capability entirely from SDK 53.

`@nx/expo` added to the workspace; `apps/kds-mobile` generated with `app.json`, `eas.json`, a
`project.json` whose `start`/`run-android`/`run-ios` targets depend on `api-contract:generate:ts`
(copying `apps/pos-mobile/project.json`), `.env.example` with `API_BASE_URL`, `RootProvider` from
`@gatherloop-pos/provider`, a two-screen `@react-navigation/native-stack`, and
`ExpoPushTokenRepository` in `libs/ui/src/data/native/` — the one file importing
`expo-notifications` — creating the `orders-v1` Android channel at `MAX` importance on launch
(D23). `expo-notifications` is installed with `npx expo install` so the SDK-51-compatible version
is chosen; **no `react-native` or `expo` version moves** (D25).

**Acceptance:** `npx nx run kds-mobile:run-android` installs; logging in, granting permission,
registering the device, and tapping **Send test notification** produces a notification **with
sound on a locked, backgrounded phone** — foreground-only is not a pass, see Risks;
`GET /kds/devices` shows one row; **Unregister** removes it. **`apps/pos-mobile` still builds and
runs** (`npx nx run pos-mobile:run-android`) — the regression this phase could plausibly cause,
given D25's shared dependency tree. `npm run lint` and `npm test` green across the workspace.

### Phase 6 — The outbox table and the station rule (API)

Migration `000032_create_kds_notifications`. `KdsNotification`, `KdsNotificationStatus`
(`pending | sent | failed | skipped`) and `KdsStation`; `ShouldNotify(Transaction) bool` and
`StationLines(Transaction) []KdsStationLine` in `domain/kds_notification_routing.go`;
`IsStaleForNotification(Transaction, time.Time) bool` implementing the D22 business-day comparison
next to them; `BuildKdsPushMessage(Transaction, sound string) KdsPushMessage` (FR-6);
`KdsNotificationRepository` (enqueue, claim pending, mark sent, mark failed, mark skipped) with its
mysql implementation and generated mock. **Nothing calls any of it yet** — this phase is the rules
and their storage, reviewed on their own.

**Acceptance:** `kds_notification_routing_test.go` covers every row of the FR-2 table, including
the two board-game cases and an item whose category station is empty, and asserts
`ShouldNotify(t) == (len(StationLines(t)) > 0)` across all of them; a staleness test covers same
day, previous day, and 23:59 → 00:01 either side of the midnight boundary; a message-building test
asserts the title carries `transactionNumber` (not the id), that a mixed transaction's body
carries both station labels in `BAR`-then-`KITCHEN` order while a bar-only one carries just its
own, and that the sound name is the configured one; a repository test asserts a duplicate enqueue
leaves one row; `make migrate-up`/`make migrate-down` clean; `npx nx run api:test` green.

### Phase 7 — Enqueue on payment (API)

`payTransaction` (`transaction_usecase.go:209`) gains the `KdsNotificationRepository` parameter and
the `EnqueueForTransaction` call inside the existing `BeginTransaction` callback;
`TransactionUsecase` and `PaymentUsecase` gain the dependency and `main.go` passes it. Rows are
written and nothing dispatches them yet, so the observable behaviour is a growing `pending` table.

**Acceptance:** `transaction_usecase_test.go` asserts that paying a bar-only transaction enqueues
one row, **a mixed bar-and-kitchen transaction also enqueues exactly one** (D24), **a
board-game-ticket-only transaction enqueues none**, and **a transaction created yesterday enqueues
one row with `status = 'skipped'`** (D22); `payment_usecase_test.go` asserts the same for a QRIS
confirmation and that confirming twice still yields one row; every existing payment test still
passes; `npx nx run api:test` green.

### Phase 8 — The dispatcher (API)

`DispatchPending` per FR-4, the post-commit goroutine kick, and the `KDS_DISPATCH_INTERVAL_SECONDS`
ticker started in `main.go` with graceful shutdown. Structured logs on every send, failure and
device prune, using the existing `slog` setup.

**Acceptance:** use-case tests over the mock gateway cover success on every device, **partial
success (one device accepts, one fails → row is `sent`, the failure recorded in `detail`)**, total
failure (`attempt_count` increments, row stays `pending`), exhaustion at five attempts (`failed`,
`detail` set), `DeviceNotRegistered` (that device soft-deleted), no registered devices at all
(`skipped`), and that a `skipped` row is never picked up. End to end on staging with two phones
registered: a guest order paid by QRIS buzzes **both**, once each; a mixed coffee-and-sandwich
order buzzes both **once**, with both station labels in the body; a POS sale of one board-game
ticket buzzes nothing. `npx nx run api:test` green.

### Phase 9 — Documentation and coverage

A `docs-site/` page under the sales section — what the KDS app is, how to set a phone up, how the
station on a category decides **whether** an order notifies and how to read the station labels in
the alert, and what to do when a phone stops receiving — plus its sidebar entry. `apps/api/.env.example` and `README.md` gain the three new variables and the
`apps/kds-mobile` entry in the project-structure block. A `pos-web-e2e` spec asserting that paying
a POS transaction whose only item is in a `NONE`-station category creates no `kds_notifications`
row, and one for a `BAR` item that does.

**Acceptance:** `npx nx run pos-web-e2e:e2e` passes locally — CI runs Playwright post-merge only
(`.github/workflows/e2e-main.yml`), so local is the gate; the docs page renders in
`npx nx run docs-site:dev`.

---

## Risks

**The phone is silent, on Do Not Disturb, or its battery optimiser killed the app.** The most
likely real-world failure, and not fully solvable in software. Mitigations: every push is sent at
`priority: high` so the OS wakes a dozing phone instead of holding the message until the screen
comes back on (D26); the Android `orders` channel is created at `MAX` importance with sound and
vibration; the setup screen surfaces
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

**The two mobile apps cannot drift, so a later Expo SDK bump is a two-app change.** D25 — one
hoisted `react-native@0.74.1` and `expo@51.0.39`, no workspaces. Nothing to do now (SDK 51's
default pairing *is* RN 0.74, so the KDS app lands on the versions already installed), but whoever
upgrades the KDS app to SDK 52+ is also upgrading `apps/pos-mobile` to RN 0.76+ and owes it a
regression pass. The mitigation, if it ever bites, is npm workspaces — a repo-wide change this
PRD does not need.

**A custom sound may not play when the app is backgrounded on Android.** There are open
`expo-notifications` reports of exactly this — custom sound working in the foreground and falling
back to the default when the app is backgrounded or killed, which is the *only* state that matters
for a counter phone. It does not affect this PRD's default (`default`), and D23's groundwork is
what makes the fix cheap, but it means the custom sound must be accepted on a **locked, backgrounded
phone** before it is called done, not in a foreground test. Phase 5's acceptance says so
explicitly. If it proves unreliable, an always-audible alternative is a high-importance channel
with the device's default alarm-style sound.

**Notification fatigue — the accepted cost of D24.** Every paid transaction with a preparable item
buzzes every phone, so a staff member working the kitchen is alerted for drinks and vice versa. A
staff member who mutes the phone to cope has disabled the feature, silently. This is the risk most
likely to need a follow-up, and the one to watch first after launch.

Three things bound it, none of which make it go away. The `NONE`-station filter removes tickets,
rentals and anything else not made to order. A mixed transaction is now **one** push per phone
instead of two, so the busiest orders got quieter. And the body's station labels mean a
glance — not a tap — is enough to tell whose order it is.

If it does become real, the escape hatches in order of cost: a quiet mode on the KDS view (that
PRD's), per-transaction batching during a rush, and finally per-station delivery, which D24 prices
as additive.

**A dead token means that phone hears nothing.** If a phone's token rotates and nobody
re-registers, that device receives nothing — but under D24 the other phone still gets the same
alert, so a single dead token costs nothing at a two-phone venue. The case that matters is *every*
device dead, which the dispatcher records as `skipped` with `detail = 'no registered devices'`
rather than pretending to deliver. Mitigated further by `last_seen_at` in the device list and by
the app re-registering on every launch.

---

## Out of Scope

| Not doing | Why |
| --- | --- |
| **The KDS view** — ticket list, item detail, status, bump | Stated in the acceptance criteria. Its data is already served: `GET /transactions?fulfillment=preparing` is the queue and `PUT /transactions/{id}/complete` is the bump (`docs/prd-order-fulfillment-status.md`). Its own PRD. |
| **Acknowledging a notification** | Needs a ticket view to acknowledge from. The alert here is one-way. |
| **Per-item or per-station completion** | `docs/prd-order-fulfillment-status.md` D21 — one completion per order. Unchanged. |
| **Notifying on POS transaction creation** | D1, Option A. The venue rarely runs open bills (Settled in review, 1), so the payment trigger is never late in practice. |
| **Automatic printing of the order slip on payment** | Settled in review, 5 — the natural follow-up, sharing this trigger and this station rule, but a POS-side change (`usePrinter`) rather than a server one. |
| **Re-notifying after unpay → re-pay** | D4. The correction is to the money, not the drink. |
| **A POS screen for managing KDS devices** | The KDS app registers and unregisters itself. A device list in the POS is useful once there are more than three phones; `GET /kds/devices` already serves it. |
| **Notifying the cashier or the manager** | Only `BAR` and `KITCHEN` are stations. A `MANAGER` pseudo-station would be a different feature with a different rule. |
| **Shipping a custom sound file** | Settled in review, 4 — wanted later, and D23 is the groundwork that keeps it a one-line change. |
| **Sound customisation per station** | One channel, one sound. Two sounds is a setting nobody has asked for. |
| **Per-station delivery** (a phone that only hears the bar) | D24 — every device gets every order, and the station is a label in the body rather than a routing key. Additive later: a nullable `station` on `kds_notifications` plus a subscription table, with historical rows left `NULL` meaning "sent to everyone", which is exactly true of them. |
| **Scheduling which station a phone covers** (shift rosters, auto-switching) | A roster is a feature for a staffing problem this venue does not have — and after D24 there is no per-phone station to schedule. |
| **Migrating `apps/pos-mobile` to Expo** | Out of scope and not blocking; see Risks. |
| **Recording which staff member is on the bar** | `CheckAuth` discards JWT claims (D10) — the same groundwork `docs/prd-order-fulfillment-status.md` identifies for `completed_by_user_id`. |
| **Web push to `apps/pos-web`** | A different transport with a different permission model, for a surface that is already staffed by someone looking at it. |

---

## Settled in review

All five open questions from the first draft are answered. Recorded here rather than deleted, so
the reasoning behind D20–D23 keeps the question that produced it.

1. **Does the venue ever run an open bill?** — *"We rarely do open bill, so we can ignore it for
   now."* **No change.** D1 stands: payment is the trigger, and Option C's *Send to Kitchen*
   action stays unbuilt. If open bills become common, that action is additive — it does not
   replace the payment trigger, so nothing here has to be undone.

2. **Should the bar and the kitchen share one phone?** — *"Two staff, both working kitchen and
   bar, they usually split (1 kitchen, 1 bar) but sometimes work together in bar. Each has their
   own phone."* Answered first with **D20** (a device subscribes to a set of stations) plus
   **D21** (a station nobody subscribes to broadcasts to everyone), then **both superseded by
   D24** in the second pass: one notification per transaction, to every phone, with the stations
   as labels in the body. The answer to the question is unchanged — a phone is never tied to one
   station — but it is now reached by removing the mechanism rather than by adding a fallback to
   it.

3. **Should a transaction paid on a later day notify?** — *"Sure, we can disable the notification
   if we paid the yesterday transaction."* **D22**: such rows are written `skipped` and never
   dispatched, on the business-day boundary
   [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md) D6 already defines.

4. **Can we use a custom sound later?** — *"I can do custom sound file right? I will do it
   later."* **Yes, and D23 makes later cheap.** Two gotchas decided now rather than discovered
   then: an Android notification channel's sound is immutable once created, so the channel id is
   versioned (`orders-v1`) and a new sound means `orders-v2`; and the iOS sound filename travels
   in the push payload, so the server needs to know it — hence `KDS_PUSH_SOUND`. When you do it:
   add the asset via the `expo-notifications` config plugin's `sounds` array, bump the channel id,
   set the env variable. No migration, no contract change.

5. **Should printing become automatic?** — *"Sure, we will do automated printing after this, but
   not in this PRD."* **Out of scope, deliberately.** It shares this feature's trigger and its
   station rule, but printing is client-side (`usePrinter`, `libs/ui/src/utils/print.ts`), so it
   is a POS change rather than a server one and would make this PRD span three apps. The station
   rule is already shared by construction (FR-2 adopts `buildOrderSlipPayload`'s predicate), so
   the follow-up inherits it rather than re-deriving it.

---

## Success Criteria

1. A guest pays by QRIS at a table and the bar phone buzzes within five seconds, with the app
   closed and the screen locked, showing the transaction number.
2. A cashier sells one board-game ticket and nothing buzzes — with no code anywhere mentioning
   board games.
3. A transaction with a coffee and a sandwich produces **one** notification on every phone, whose
   body names both stations and their items — and each staff member can tell at a glance which
   line is theirs.
4. **No paid order is ever unheard.** There is no configuration of the phones — short of every one
   of them being unregistered — that makes an order arrive silently, because there is no
   configuration at all (D24).
5. A staff member moving from the kitchen to the bar does not touch the app.
6. Setting up a new phone takes one person under two minutes: install, log in, name the device,
   grant permission, tap **Send test notification**, see it arrive.
7. When a barista reports a missed order, `SELECT * FROM kds_notifications WHERE transaction_id = ?`
   answers whether it was enqueued, attempted, delivered, broadcast or deliberately skipped, and
   `detail` says why.
8. A transaction created yesterday and settled this morning buzzes nothing, and the outbox says so.
9. No frontend in this repo holds a push-provider credential or calls a push provider directly.
10. Payment behaviour is unchanged: every existing `transaction_usecase_test.go` and
    `payment_usecase_test.go` case passes untouched, and a push-gateway outage cannot fail or roll
    back a payment.
11. The next PRD can build the KDS view with no migration and no new endpoint — the queue, the
    routing and the bump are all already served.

---

## Sources

- Expo — Push Notifications overview, `expo-notifications`, and the Expo Push API including
  `DeviceNotRegistered` receipts: https://docs.expo.dev/push-notifications/overview/
- Expo — sending notifications from a server, and the `sound` / `channelId` message fields
  (a `.wav` filename with no directory, or `default`):
  https://docs.expo.dev/push-notifications/sending-notifications/
- Expo — push notification setup: the FCM V1 credentials Android needs and the paid Apple
  Developer account iOS needs: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo — push notifications FAQ, including the removal of Expo Go push support in SDK 53:
  https://docs.expo.dev/push-notifications/faq/
- Expo issue #27978 — custom push sound playing only in the foreground on Android, the reason
  Phase 5's acceptance tests a backgrounded phone: https://github.com/expo/expo/issues/27978
- Expo changelog — SDK 51 supports React Native 0.74 (default) and 0.75, the pairing D25 rests on:
  https://expo.dev/changelog/2024-08-14-react-native-0.75
- Firebase Cloud Messaging HTTP v1 API (the Option I alternative):
  https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Android — notification channels and importance levels, and the rule that a channel's settings
  cannot be changed programmatically after creation (D23):
  https://developer.android.com/develop/ui/views/notifications/channels
- Expo — the `expo-notifications` config plugin `sounds` array, for bundling a custom sound (D23):
  https://docs.expo.dev/versions/latest/sdk/notifications/#configurable-properties
- Apple — Critical Alerts entitlement, and why it is not pursued:
  https://developer.apple.com/documentation/usernotifications/unnotificationsound/critical-sounds
- Toast Kitchen Display System — station routing and new-ticket alerting:
  https://pos.toasttab.com/products/kitchen-display-system
- Square KDS — per-station ticket routing and new-order sounds:
  https://squareup.com/help/us/en/article/6595-square-kds
- Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
