# PRD: Guest Web Push — Telling the Customer Their Order Is Ready, Wherever They Are

**Status:** Draft for review
**Scope:** a service worker and Web Push subscription in `apps/order-web`, and the backend that
pushes a notification to the guest's browser when a staff member marks their order ready.
**Marking the order ready is already built** ([`docs/prd-order-fulfillment-status.md`](./prd-order-fulfillment-status.md))
— this is the outbound channel to the guest and nothing else.

---

## Problem Statement

[`docs/prd-order-fulfillment-status.md`](./prd-order-fulfillment-status.md) closed the fulfilment
loop on the staff side: a barista opens the transaction row menu, taps **Mark as ready**,
`PUT /transactions/{id}/complete` sets `transactions.completed_at`
(`apps/api/domain/transaction_usecase.go:308`), and the guest's status page flips from
*"Sedang disiapkan"* to *"Pesanan siap diambil"*.

**The guest only sees that flip if they are still looking at the page.**

The mechanism is short polling, and it is entirely client-side. `OrderStatusUsecase`
(`libs/ui/src/domain/usecases/orderStatus.ts`) holds a `setInterval` at
`PREPARATION_POLL_INTERVAL_MS = 10_000` while the state is `preparing`, re-fetching
`GET /payments/{partnerReferenceNo}` and re-deriving the state from `payment.fulfillmentStatus`.
That timer has three properties that matter here:

1. **It belongs to a page that must stay open.** The guest paid, saw *"Sedang disiapkan"*, and now
   has five to fifteen minutes of nothing to do. They switch to Instagram, answer a message, or
   lock the phone. Mobile Safari and Chrome both throttle or suspend timers in a backgrounded tab,
   and a phone that has been locked for ten minutes is not polling at all.
2. **It dies with the tab.** `docs/prd-order-fulfillment-status.md` FR-8 already acknowledged this
   and shipped a mitigation — a `beforeunload` confirmation when leaving a preparing order — which
   is the product conceding that the page closing is a real, expected event, and then asking the
   guest not to let it happen.
3. **Even when it works, it is silent.** A tab that updates in the background produces no sound, no
   vibration and no lock-screen entry. Nothing crosses from the page into the guest's attention.

So the current best case is: the guest sits at the table holding an unlocked phone with one tab
open, staring at a spinner, for the entire preparation. Every other case — and it is the common
case — degrades to the guest periodically re-opening the tab to check, or walking to the counter to
ask, which is exactly the counter interaction self-service ordering was built to remove.

The staff side of this same gap was closed three months ago.
[`docs/prd-kds-order-notifications.md`](./prd-kds-order-notifications.md) built a transactional
outbox, a push gateway and a dedicated receiver app so that *the barista* is told an order arrived
without looking at anything. The guest, at the other end of the same order, still has to watch.

### Root cause

**The order app has an inbound channel and no outbound one.** Every piece of state the guest sees
arrives because their browser asked for it — SSR on first load (`getServerSideProps` in
`apps/order-web/src/pages/orders/[reference].tsx`), then a polling loop. There is no way for
`apps/api` to reach a guest's phone, and no artefact in `apps/order-web` capable of receiving
anything: there is no service worker, no manifest, and `apps/order-web/public/` contains a logo, a
favicon and a stylesheet.

The KDS PRD reached the identical conclusion for staff and answered it with Expo push to a native
app. That answer does not transfer: a guest will not install an app to collect a coffee. The
web-native equivalent — a service worker plus the Web Push API — is the same architecture with a
different transport, and its own hard constraint on iOS (see D12).

`docs/prd-kds-order-notifications.md` even names this as the thing it is not doing:
*"**Web push to `apps/pos-web`** — a different transport with a different permission model, for a
surface that is already staffed by someone looking at it."* The guest surface is the one where
nobody is looking.

---

## How the Industry Handles This

Guest-facing pickup notification is a solved problem with a very consistent shape.

- **Starbucks, McDonald's, Domino's (native apps)** — order-ahead pickup is push-notified, always.
  The notification is the product feature; the order-status screen exists for the person who
  happens to be looking.
- **Chick-fil-A / Panera web ordering** — Web Push on Android and desktop, SMS fallback elsewhere.
  Two channels because one channel never covers every guest.
- **Toast, Square and Lightspeed "order ready" SMS** — the dominant answer for venues without an
  app, precisely because SMS needs no install, no permission and no browser support matrix. Its
  cost is per-message and it needs a phone number, which is why it is an alternative here and not
  the recommendation (Option B).
- **Flash/vibrating pagers** — the physical ancestor, and still the fallback at venues that have
  them. They are hardware to buy, charge, lose and sanitise, and they only work inside the venue.
- **Progressive web apps in Indonesian F&B (GoFood merchant-side, Jenius, Tokopedia web)** — the
  install-to-home-screen flow is familiar to the local audience, which matters for D12's iOS
  constraint.

Four lessons the design below takes directly:

1. **The notification is a summons, not a document.** Order number, table, one line. The detail is
   on the page it links to.
2. **Never remove the fallback.** Every product above keeps the status screen working for the guest
   whose notification did not arrive. Push is additive, never a replacement (D9).
3. **Ask for permission at the moment of value, never on arrival.** A permission prompt on page
   load is the fastest way to a permanent denial, and there is no second prompt.
4. **Assume the guest is on iOS and has not installed anything.** This is the constraint that
   decides most of the UX (D12).

---

## Alternatives Considered

### 1. How does the venue reach a guest who has left the page?

**Option A — Web Push (RFC 8030/8291/8292) with a service worker, VAPID-signed from `apps/api`. ← Recommended**

- ✅ **No install, no phone number, no per-message cost.** The guest taps one button on a page they
  are already on.
- ✅ The payload is end-to-end encrypted to the subscription's keys (RFC 8291); the push service —
  Google, Mozilla, Apple — relays ciphertext it cannot read. The venue's guest data never reaches a
  third party in readable form, which is a stronger privacy position than SMS.
- ✅ Native OS notification: lock screen, sound, vibration, notification tray. It reaches a guest
  whose phone is in their pocket, which is the entire point.
- ✅ Works with the app closed and the browser killed — the push wakes the service worker.
- ✅ VAPID means no vendor account at all. `apps/api` generates a keypair once and signs its own
  requests; there is no Firebase project, no service account JSON on the VPS and no third-party
  dashboard (contrast Option E).
- ❌ **On iOS it only works for a web app installed to the Home Screen.** The single biggest cost
  in this PRD, priced in D12 and in Risks.
- ❌ A `201 Created` from the push service means *accepted for delivery*, not *delivered*. There are
  no per-message receipts the way Expo provides them (D8). The outbox records what we sent, not
  what arrived.

**Option B — SMS / WhatsApp on order ready.**

- ✅ Universal. No permission model, no browser support matrix, no iOS caveat, reaches a guest who
  has walked out of range of the venue's Wi-Fi.
- ❌ **Requires collecting a phone number.** Checkout currently asks for a name and nothing else
  (`PaymentCheckoutRequest` is `{ customerName }`, `api.yaml:5091`). Adding a required phone field
  to a self-service flow whose whole appeal is speed is a conversion cost paid by every guest to
  benefit the ones who leave the page.
- ❌ Per-message cost, a gateway vendor, a sender-ID registration, and Indonesian A2P rules — real
  procurement for an MVP.
- ❌ It is genuinely additive rather than alternative: the right long-term answer is probably
  *both*, push first and SMS for the guest who declined it. Nothing in this design blocks that.

**Option C — Keep polling, but make it louder (a `Notification` from the open page, a page title
badge, an audio element).**

- ✅ Cheapest possible change; no backend at all.
- ❌ **Solves the wrong half.** All three need the page to be open and running JavaScript, which is
  exactly the premise that fails. A backgrounded tab's timer is throttled to minutes or stopped.
- ❌ An `<audio>` element cannot play without a prior user gesture, and iOS silences it when the tab
  is not frontmost.

**Option D — WebSocket or SSE to the guest's page.**

- ❌ Same failure as Option C, with more infrastructure: a socket closes when the tab is
  backgrounded or the phone sleeps. It makes the *open-page* case faster, which was never the
  problem.
- ❌ Already rejected for this exact surface in `docs/prd-order-fulfillment-status.md` D16 and again
  in `docs/prd-kds-order-notifications.md` Option J, on the same reasoning — `apps/api` is a
  stateless `net/http` binary under systemd
  ([`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md)).

**Option E — A managed push vendor (OneSignal, Pusher Beams, Firebase Cloud Messaging JS SDK).**

- ✅ A dashboard, delivery analytics, and someone else's SDK handling the browser matrix.
- ❌ Puts a third-party script on the guest-facing page and a third party's cookie next to a payment
  flow. Web Push with VAPID needs no vendor, so this buys a dashboard at the price of a data
  processor.
- ❌ FCM's JS SDK in particular means a Firebase project, `firebase-messaging-sw.js` alongside our
  own service worker, and a service account on the VPS — strictly more moving parts than signing
  our own VAPID requests.
- ❌ `docs/prd-kds-order-notifications.md` D7 accepted an Expo hop for *staff convenience*
  explicitly because it was not money and not guest data. Neither carve-out applies here.

**Verdict: Option A**, behind a `WebPushGatewayRepository` interface so Option E remains a
one-package swap, exactly as `KdsPushGatewayRepository` does for Expo (D7 of the KDS PRD).

### 2. Which event notifies the guest?

**Option F — `CompleteTransaction` — the staff member marks the order ready. ← Recommended**

- ✅ **One function, one guard already in place.** `TransactionUsecase.CompleteTransaction`
  (`transaction_usecase.go:308`) already rejects anything that is not
  `TransactionSourceOrder` and anything already completed, so the only transactions that reach the
  enqueue are guest orders becoming ready for the first time.
- ✅ It is the event the guest is waiting for, and the only one. There is no ambiguity about what
  the notification means.
- ✅ It matches the state the page already derives: `fulfillmentStatus === 'ready'`
  (`orderStatus.ts`), so push and poll can never disagree about what "ready" is.

**Option G — Also notify on payment confirmed ("we got your order").**

- ❌ The guest is holding the phone looking at the QR at that exact moment; the page already
  transitions. A notification for something already on screen is noise, and noise is what gets the
  permission revoked before the one notification that matters.
- Out of scope, not rejected forever — the subscription and the outbox make it additive.

**Option H — A time-based "your order is taking longer than usual" nudge.**

- ❌ Needs a per-item preparation-time model the system does not have, and it notifies about a
  problem rather than a resolution.

**Verdict: Option F.** One trigger, at one line, guarded by conditions that already exist.

### 3. How does a push find the right browser?

The guest is anonymous. There is no account, no login and no email.

**Option I — Key the subscription to `gl_session_id`, the identity the order app already uses. ← Recommended**

- ✅ **It already exists and is already load-bearing.** `resolveSession`
  (`libs/ui/src/data/session/resolveSession.ts`) mints a UUIDv4 into the `gl_session_id` cookie
  during SSR; `CookieSessionRepository` mirrors it into `localStorage`; every order-app API call
  sends it as `X-Session-Id` (`libs/ui/src/data/api/{cart,payment,customer}.ts`) and
  `RequireSessionId` (`presentation/restapi/base_middlewares.go:99`) validates it.
- ✅ **`payments.session_id` already links a transaction back to the guest** — the column has been
  on the table since `000025_create_payments.up.sql`, is indexed
  (`idx_payments_session_id`), and is how `GET /payments` already scopes order history to one
  guest. Resolving *which browser to push* is therefore a lookup the schema already supports.
- ✅ It is the right granularity. One guest may place several orders in an evening from one browser;
  they subscribe once and hear about all of them.
- ✅ A session that never opted in simply has no subscription rows, which the dispatcher records as
  `skipped` rather than failing.
- ❌ Clearing site data or switching browsers orphans the subscription. Bounded: the orphan is
  pruned on its next `404`/`410` (D10), and the guest re-opts-in on the new session with one tap.

**Option J — Key the subscription to the payment reference (`partnerReferenceNo`).**

- ✅ Narrowest possible scope: a subscription can only ever notify about one order, and it is
  obviously disposable afterwards.
- ❌ The guest has to grant permission again for their second order of the evening, which is a
  second prompt they will decline.
- ❌ The browser has **one** `PushSubscription` per origin, not one per page. Modelling it per order
  means several rows sharing one endpoint, and an unsubscribe for one order silently kills the
  others.

**Option K — Ask the guest for an email or phone at checkout and key on that.**

- ❌ That is Option B's conversion cost with none of Option B's universality.

**Verdict: Option I.** The session is already the guest's identity in this app; introducing a second
one for notifications is the "two taxonomies that drift" mistake
`docs/prd-kds-order-notifications.md` D2 argues against.

### 4. What guarantees the push actually goes out?

Identical question to `docs/prd-kds-order-notifications.md` §4, and the same answer, for the same
reasons — restated briefly rather than re-argued.

**Option L — Call the push service inline, inside `CompleteTransaction`'s DB transaction.** ❌ An
HTTP call to `fcm.googleapis.com` inside an open MySQL transaction holds row locks across someone
else's network, and a push-service timeout would roll back a completion the barista already
performed and moved on from.

**Option M — Fire-and-forget goroutine after commit.** ❌ Unobservable and unretryable. When a guest
says *"I never got a notification"*, there is nothing to look at.

**Option N — Transactional outbox: enqueue inside the completion's transaction, dispatch after
commit, with the existing background sweeper picking up stragglers. ← Recommended** ✅ Atomic with
the completion, retryable, inspectable, idempotent by unique key — and **the machinery already
exists in this codebase**. `runKdsDispatchSweeper` (`apps/api/main.go:232`) is a ticker this feature
extends rather than duplicates (D5).

**Verdict: Option N.**

---

## System Design Overview

### The path, end to end

```
 Guest (order app)                       Staff (POS)
      │                                       │
      │  taps "Beri tahu saya"                │  taps "Mark as ready"
      ▼                                       ▼
 ServiceWorkerWebPushRepository          PUT /transactions/{id}/complete
  ├─ Notification.requestPermission()         │
  ├─ navigator.serviceWorker.register()       ▼
  └─ PushManager.subscribe({                TransactionUsecase.CompleteTransaction
        userVisibleOnly: true,                │   ← transaction_usecase.go:308, the ONE trigger
        applicationServerKey: vapidPublicKey  │   (inside BeginTransaction)
     })                                       ├─ guards: source == 'order', not already completed
      │                                       ├─ transactionRepository.CompleteTransaction   (unchanged)
      ▼                                       └─ GuestNotificationUsecase.EnqueueForCompletedTransaction
 POST /web-push/subscriptions                        │
  { endpoint, keys: { p256dh, auth } }               ├─ payment lookup by transaction_id ⇒ session_id
  X-Session-Id: <gl_session_id>                      └─ INSERT guest_notifications (transaction_id, session_id)
      │                                              │
      ▼                                           COMMIT
 web_push_subscriptions (upsert by endpoint)         │
                                                     ▼
                                        dispatch now (goroutine)  ◄── every 15s, the existing
                                                     │                sweeper picks up stragglers
                                                     ├─ every live subscription for that session_id
                                                     ▼
                                        WebPushGatewayRepository.Send(messages)
                                                     │   aes128gcm payload, VAPID-signed
                                                     ▼
                                        FCM / Mozilla autopush / web.push.apple.com
                                                     │
                                                     ▼
                                        apps/order-web/public/sw.js  →  'push' event
                                                     │
                                                     └─ showNotification("Pesanan #12 siap diambil!")
                                                            │  tap
                                                            ▼
                                        'notificationclick' → focus or open /orders/ORD…
```

Two properties worth naming. The completion guard is *already* the routing rule — only
`source = 'order'` transactions can be completed at all — so this feature needs no equivalent of
the KDS PRD's `categories.station` predicate. And the guest's polling loop is untouched (D9): when
the tab *is* open, polling is still what repaints the screen.

### New tables

Migrations `000033` and `000034` (`000032_create_kds_notifications` is the latest).

```sql
-- 000033_create_web_push_subscriptions.up.sql
CREATE TABLE web_push_subscriptions (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id   CHAR(36)     NOT NULL,          -- gl_session_id, the guest's browser
  endpoint     VARCHAR(512) NOT NULL,          -- https://fcm.googleapis.com/fcm/send/… etc.
  p256dh_key   VARCHAR(255) NOT NULL,          -- RFC 8291 client public key, base64url
  auth_key     VARCHAR(255) NOT NULL,          -- RFC 8291 auth secret, base64url
  user_agent   VARCHAR(255) NOT NULL DEFAULT '',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP    NULL,
  deleted_at   TIMESTAMP    NULL,
  UNIQUE KEY uq_web_push_subscriptions_endpoint (endpoint),
  KEY idx_web_push_subscriptions_session (session_id, deleted_at)
);

-- 000034_create_guest_notifications.up.sql
CREATE TABLE guest_notifications (
  id             BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT      NOT NULL,
  session_id     CHAR(36)    NOT NULL,          -- snapshotted at enqueue (D6)
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | sent | failed | skipped
  attempt_count  INT         NOT NULL DEFAULT 0,
  detail         TEXT        NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at        TIMESTAMP   NULL,
  UNIQUE KEY uq_guest_notifications_transaction (transaction_id),
  KEY idx_guest_notifications_status (status, created_at)
);
```

`guest_notifications` is deliberately `kds_notifications` with one column added — the same four
statuses, the same `detail`, the same `attempt_count`, the same unique key on `transaction_id`. A
support question is answered by the same `SELECT` shape on either table.

`VARCHAR(512)` takes a full unique index: 512 × 4 bytes for `utf8mb4` is 2048, under InnoDB's
3072-byte limit, so no prefix index is needed. Neither table takes a foreign key, matching every
other table in this schema except `payments`.

`web_push_subscriptions` stores **no notification content**, and `guest_notifications` stores no
copy of the message — the dispatcher re-reads the transaction and builds the payload at send time,
exactly as `BuildKdsPushMessage` does.

### New API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/public/web-push/config` | none | The VAPID public key the browser needs for `applicationServerKey` (D3) |
| `POST` | `/web-push/subscriptions` | `RequireSessionId` | Register or refresh this browser's subscription (upsert by endpoint) |
| `DELETE` | `/web-push/subscriptions` | `RequireSessionId` | Unsubscribe — the guest turned notifications off |

Three routes. The config route joins `public_route.go` alongside `publicCategoryList` and friends,
because a browser needs the key *before* it has done anything session-scoped. The two subscription
routes get their own `web_push_subscription_route.go` wrapped in `RequireSessionId`
(`base_middlewares.go:99`) rather than `CheckAuth` — these are guest routes, and per
`apps/api/CLAUDE.md` a customer-facing route never has `CheckAuth` stripped from it, it is written
without it from the start. Both list `http.MethodOptions` for CORS preflight.

Contract additions in `libs/api-contract/src/api.yaml`:

```yaml
    WebPushConfig:
      type: object
      required: [vapidPublicKey]
      properties:
        vapidPublicKey:
          type: string          # base64url-encoded uncompressed P-256 point

    WebPushSubscriptionRequest:
      type: object
      required: [endpoint, p256dhKey, authKey]
      properties:
        endpoint:
          type: string
          maxLength: 512
        p256dhKey:
          type: string
        authKey:
          type: string
        userAgent:
          type: string
          maxLength: 255

    WebPushSubscriptionDeleteRequest:
      type: object
      required: [endpoint]
      properties:
        endpoint:
          type: string
          maxLength: 512
```

Operations `webPushConfigFind`, `webPushSubscriptionCreate`, `webPushSubscriptionDelete`.
**Nothing on `Payment` or `Transaction` changes** — the notification is a side effect of completion,
not a field on anything (D14), so `apps/pos-web`, `apps/pos-mobile` and the existing
`libs/ui/src/__mocks__/api-contract.ts` transaction path are untouched.

### New backend files

| Layer | File | Contents |
| --- | --- | --- |
| Entity | `domain/web_push_subscription_entity.go` | `WebPushSubscription` |
| Entity | `domain/guest_notification_entity.go` | `GuestNotification`, `GuestNotificationStatus`, `BuildGuestPushMessage` |
| Repo iface | `domain/web_push_subscription_repository.go` | CRUD + `GetWebPushSubscriptionsBySessionId` |
| Repo iface | `domain/web_push_gateway_repository.go` | `WebPushMessage`, `WebPushReceipt`, `WebPushGatewayRepository` — its own file, so the transport needs nothing from the subscription slice and the two can be built in parallel (*Phase dependencies*, D17) |
| Repo iface | `domain/guest_notification_repository.go` | outbox CRUD |
| Use case | `domain/web_push_subscription_usecase.go` | subscribe / unsubscribe / config |
| Use case | `domain/guest_notification_usecase.go` | `EnqueueForCompletedTransaction`, `DispatchPending`, `TriggerDispatch` |
| MySQL | `data/mysql/web_push_subscription_{repo,entity,transformer}.go` | |
| MySQL | `data/mysql/guest_notification_{repo,entity,transformer}.go` | |
| Gateway | `data/webpush/web_push_repo.go` | `webpush-go`; mirrors `data/expopush/` exactly |
| Mock | `data/mock/{web_push_subscription,guest_notification}_repository.go` | generated by `go generate ./...` |
| REST | `presentation/restapi/web_push_subscription_{handler,route,transformer}.go` | |

Changed: `domain/transaction_usecase.go` (`CompleteTransaction` gains the outbox dependency,
`UncompleteTransaction` gains the delete — D7), `domain/payment_repository.go`
(`GetPaymentByTransactionId`, which does not exist today), `presentation/restapi/public_handler.go`
and `public_route.go` (the config route), `main.go` (wiring, and the sweeper gains a second dispatch
call — D5), `utils/env.go` (`WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`,
`WEB_PUSH_SUBJECT`).

### New frontend slice (`libs/ui`)

```
domain/entities/WebPushSubscription.ts        WebPushSubscription, WebPushConfig
domain/repositories/webPush.ts                browser-side: isSupported, isStandalone,
                                              getPermissionStatus, requestPermission,
                                              subscribe, getSubscription, unsubscribe
domain/repositories/webPushSubscription.ts    API-side: fetchConfig / subscribe / unsubscribe
domain/usecases/orderNotificationSubscribe.ts (+ .test.ts)
data/api/webPushSubscription.ts, .transformer.ts
data/browser/ServiceWorkerWebPushRepository.ts   the ONLY file importing navigator.serviceWorker
data/browser/index.ts
data/mock/webPush.ts, webPushSubscription.ts
presentation/views/components/orderStatus/OrderNotificationOptIn.tsx (+ .stories.tsx)
```

Changed: `presentation/handlers/order/OrderStatusHandler.tsx` (+ its test) gains the second use
case; `presentation/views/components/orderStatus/OrderPreparingView.tsx` renders the opt-in;
`app/order/OrderStatus.tsx` news up the two new repositories.

`data/browser/` is the web mirror of `data/native/`
(`ExpoPushTokenRepository.ts`) — a device capability behind a repository interface, which is
`docs/prd-kds-order-notifications.md` D13 applied to a different device. Its interface is
deliberately shaped like `domain/repositories/pushToken.ts`, reusing that file's exported
`PermissionStatus` union (`'granted' | 'denied' | 'undetermined'`) rather than declaring a second
one.

**No new import graph.** Unlike the KDS app, everything here lands in the existing
`@gatherloop-pos/ui/order` surface, so `libs/ui/.eslintrc.json` needs no new block — only the
existing `app/order/**` rules apply, including the `react` ban that keeps `OrderStatus.tsx` a plain
function.

### New files in `apps/order-web`

```
public/sw.js                     ~60 lines: 'push' and 'notificationclick'. No framework.
public/manifest.webmanifest      name, short_name, start_url, display: standalone, icons
public/icons/icon-192.png        required for the iOS home-screen install (D12)
public/icons/icon-512.png
src/pages/_document.tsx          <link rel="manifest">, apple-touch-icon
next.config.js                   headers(): Cache-Control: no-cache on /sw.js and the manifest
.env.example                     (no new variables — the VAPID key comes from the API, D3)
```

The service worker is **hand-written and dependency-free** (D4). Its entire contents:

```js
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag,            // 'order-<reference>' — a re-push replaces, never stacks
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => { /* focus an open client, else openWindow */ });
```

`showNotification` is called on **every** push, unconditionally — Chrome's `userVisibleOnly: true`
contract requires it, and a push handler that stays silent gets the browser's own
*"This site has been updated in the background"* notification instead, which is strictly worse than
the real one (D11).

### The notification itself

```
┌────────────────────────────────────────────────────────────┐
│  Pesanan #12 siap diambil!                                 │
│  Meja 4 · Silakan ambil di counter.                        │
└────────────────────────────────────────────────────────────┘
```

- **Title:** `Pesanan #{transactionNumber} siap diambil!` — the daily transaction number from
  [`docs/prd-daily-transaction-number.md`](./prd-daily-transaction-number.md), which is already the
  largest thing on the guest's status screen and the number the barista calls out.
- **Body:** `{table label} · Silakan ambil di counter.`, falling back to the customer name when the
  order has no table.
- **Copy is Indonesian**, matching every other guest surface —
  `docs/prd-order-fulfillment-status.md` D15.
- **`tag`:** `order-{partnerReferenceNo}`, so a redelivery replaces the existing notification
  instead of stacking a second one on the lock screen.
- **`data.url`:** `/orders/{partnerReferenceNo}` — the page the tap opens, which is the page the
  guest was already on.
- **Encrypted payload**, ~200 bytes, well under the 4KB Web Push limit. It carries the order number
  and the table label and nothing the guest's own screen does not already show.

---

## Proposed Solution

### FR-1 — One trigger: a transaction becoming complete

`TransactionUsecase.CompleteTransaction` (`transaction_usecase.go:308`) gains one call inside its
existing `BeginTransaction` callback, after the completion write succeeds:

```go
if err := guestNotificationRepository.EnqueueForCompletedTransaction(ctx, transaction); err != nil {
    return err
}
```

Its three existing guards do all the routing this feature needs: `DeletedAt != nil` → not found,
`Source != TransactionSourceOrder` → rejected, `CompletedAt != nil` → already completed. A POS
walk-in sale, a rental checkout and a board-game ticket can never reach the enqueue, because none of
them can be completed at all.

An enqueue failure fails the completion, for the same reason the KDS enqueue fails a payment
(`docs/prd-kds-order-notifications.md` D5): it is a local `INSERT` in an already-open transaction
with no network in it, so the only realistic failure is a database that was failing anyway.

### FR-2 — Resolving the guest

`EnqueueForCompletedTransaction` reads `payments.session_id` for the transaction, via a new
`PaymentRepository.GetPaymentByTransactionId(ctx, transactionId)`. Every completable transaction has
a payment row — `source = 'order'` is exactly the set created by
`PaymentUsecase.applyQrisStatus` — but the lookup is written to tolerate its absence, recording a
`skipped` row with `detail = 'no payment for transaction'` rather than failing a completion the
barista already performed.

The resolved `session_id` is **written onto the outbox row** (D6), not re-derived at dispatch.

### FR-3 — The outbox

`EnqueueForCompletedTransaction` inserts one `guest_notifications` row, `status = 'pending'`.
`UNIQUE (transaction_id)` makes it idempotent via
`INSERT … ON DUPLICATE KEY UPDATE id = id`, so a double completion is a no-op rather than an error.

**`UncompleteTransaction` deletes the row** (D7). This is the one place this design deliberately
departs from `docs/prd-kds-order-notifications.md` D4, and the reasoning is in D7.

### FR-4 — The dispatcher

`GuestNotificationUsecase.DispatchPending(ctx)`, structurally identical to
`KdsNotificationUsecase.DispatchPending` (`domain/kds_notification_usecase.go`):

1. Claim up to 50 `pending` rows with `attempt_count < 5`, oldest first.
2. Load each row's transaction and build its FR-5 message once.
3. Load every non-deleted subscription for the row's `session_id`. **None → `status = 'skipped'`,
   `detail = 'no active subscription for session'`.** The guest never opted in; retrying does not
   create a subscription.
4. `WebPushGatewayRepository.Send(ctx, messages)` — one message per subscription.
5. Per-subscription results decide the row's fate. **At least one accepted → `sent`**, with any
   failures recorded in `detail`. **None accepted →** `attempt_count++`, `detail` set, back to
   `pending`; at 5 attempts it becomes `failed`. **`404` or `410 Gone` soft-deletes that
   subscription** (D10).

It runs the same two ways as the KDS dispatcher: a goroutine kicked immediately after the
completion commits, and the `KDS_DISPATCH_INTERVAL_SECONDS` sweeper in `main.go`, which now drives
both outboxes (D5).

### FR-5 — The message payload

Built by a pure `BuildGuestPushMessage(transaction Transaction, reference string) WebPushMessage` in
`domain/guest_notification_entity.go`, following *System Design Overview → The notification itself*.
Pure and unit-tested, for the same reason `BuildKdsPushMessage` is: the string is the product.

### FR-6 — Subscribing, from the guest's side

`OrderNotificationSubscribeUsecase` is a finite state machine like every other use case here
(`extends Usecase<State, Action, Params>`, a pure `getNextState`, effects only in `onStateChange`):

```
idle → unsupported                            (no PushManager, or iOS Safari in a tab)
     → needsInstall                           (iOS, not running standalone — D12)
     → checkingPermission → permissionDenied
                          → subscribing → subscribed
                                        → subscribeError
     subscribed → unsubscribing → idle
```

- **Permission is requested on an explicit tap, never on mount.** There is no second prompt after a
  denial on any browser, so an unexplained prompt is a permanently lost guest (D8).
- `unsupported` renders nothing at all — no broken button, no apology. The page keeps polling and
  the guest is none the wiser.
- `needsInstall` renders the iOS *Share → Add to Home Screen* instructions instead of a button that
  cannot work (D12).
- `permissionDenied` renders one line explaining how to re-enable it in browser settings.
- `subscribed` is the resting state, with a **Matikan** (turn off) action.

All browser APIs are behind `WebPushRepository`, so the use case and its tests never touch
`navigator`, `PushManager` or `Notification` — which matters because `libs/ui`'s Jest environment
has none of them.

### FR-7 — Where the guest is asked

Inside `OrderPreparingView` — the screen the guest lands on immediately after paying, while the
order is being made. That is the first moment the guest has a concrete reason to want the
notification, and they are already waiting with nothing to do.

```
┌──────────────────────────────────────────────┐
│  Sedang disiapkan…                           │
│  Pesanan #12 · Meja 4                        │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔔  Tidak perlu menunggu di halaman ini │  │
│  │     Kami beri tahu saat pesanan siap.  │  │
│  │              [ Beri tahu saya ]        │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

The card disappears once `subscribed`, replaced by a one-line confirmation with the **Matikan**
action. It does not appear on the `ready` view — the notification's moment has passed.

### FR-8 — Polling is unchanged

`OrderStatusUsecase`'s `PREPARATION_POLL_INTERVAL_MS` loop, the `beforeunload` confirmation
(`docs/prd-order-fulfillment-status.md` FR-8) and the resume-active-order entry point (FR-9) all
stay exactly as they are (D9). Push is the channel for a guest who is *away*; polling is what
repaints a page that is *open*. A guest who has both gets the notification and finds the page
already updated when they tap it.

---

## Design decisions

**D1 — Completion is the trigger, at `TransactionUsecase.CompleteTransaction`.**
It is the only function that sets `completed_at`, and its three existing guards
(`transaction_usecase.go:315-325`) already restrict it to first-time completion of guest orders.
There is no second path to forget and no routing predicate to write, which is why this feature needs
no equivalent of the KDS PRD's `categories.station` rule.
*Alternative rejected:* also notifying on payment confirmation (Option G) — the guest is looking at
the screen at that moment, and an unnecessary notification is how the necessary one loses its
permission.

**D2 — Delivery is Web Push with VAPID, signed by `apps/api`, behind `WebPushGatewayRepository`.**
VAPID (RFC 8292) lets the API authenticate to any push service with a keypair it generates itself —
no Firebase project, no service account on the VPS, no vendor account, and no third-party script on
a page that handles payment. The interface mirrors `KdsPushGatewayRepository` and
`PaymentGatewayRepository`, so the vendor-managed alternative (Option E) stays a one-package swap.
Implemented with `github.com/SherClockHolmes/webpush-go`, which is the de-facto Go implementation of
RFC 8291 payload encryption and RFC 8292 signing.
*Alternative rejected:* hand-rolling `aes128gcm` content encoding. It is ECDH + HKDF + AES-GCM
against a spec with known interop traps, in the one part of this feature where a bug is invisible
until a guest does not get a notification.

**D3 — The VAPID public key is served by the API at `GET /public/web-push/config`, not baked into
`apps/order-web` as a `NEXT_PUBLIC_` variable.**
The public key is one half of a keypair whose private half lives in the API's environment. They must
match, and they are deployed by two different pipelines — `apps/order-web` to Vercel
(`apps/order-web/vercel.json`), `apps/api` to a VPS under systemd
([`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md)). Shipping one half
through a frontend build is how the two drift, and the failure is silent: subscriptions are created
against a key the server cannot sign for, and every push returns `403` forever. One fetch at opt-in
time removes the class of bug entirely, and makes key rotation an API restart rather than a Vercel
redeploy.
*Alternative rejected:* `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Cheaper by one endpoint and one round trip,
and wrong for the reason above.

**D4 — The service worker is hand-written in `apps/order-web/public/sw.js`, not generated by
`next-pwa` or Workbox.**
This feature needs two event listeners — `push` and `notificationclick` — and nothing else. A PWA
plugin brings precaching and runtime caching strategies into an app whose pages are
server-rendered per request with a session cookie (`getServerSideProps` in every
`apps/order-web/src/pages/**`), where a cached HTML shell would serve one guest another guest's
order. Sixty lines with no build step is both smaller and safer than configuring a caching framework
to cache nothing.
*Consequence:* `/sw.js` must be served with `Cache-Control: no-cache` via `next.config.js`'s
`headers()`. Browsers cap service-worker script caching at 24h, but a stale worker for even an hour
is a confusing bug class, and Vercel's default for `public/` is aggressive.

**D5 — One sweeper goroutine drives both outboxes.**
`runKdsDispatchSweeper` (`apps/api/main.go:232`) is already a `time.Ticker` loop at
`KDS_DISPATCH_INTERVAL_SECONDS` with graceful shutdown. It is renamed `runNotificationSweeper` and
calls `DispatchPending` on both use cases per tick. Two tickers at the same interval would be two
goroutines doing the same job, and two env variables to keep in sync for no reason anyone could
articulate.
*Consequence, inherited from `docs/prd-kds-order-notifications.md` D6:* this still assumes a single
API instance. Two instances would both sweep; the unique key stops duplicate *rows*, not duplicate
*sends*. Noted in Risks, unchanged.

**D6 — The outbox row snapshots `session_id` at enqueue; it is not re-derived at dispatch.**
The enqueue already has to read the payment to decide whether there is a guest at all (FR-2), so
storing the result costs one column and removes a `payments` read from every sweep. It also makes
the row answer the support question on its own: *"which browser were we trying to reach"* is a
`SELECT` on one table rather than a three-way join.
*Alternative rejected:* re-deriving at dispatch, the way `docs/prd-kds-order-notifications.md`
resolves devices. That is right for the KDS, where the recipient set is "every registered phone" and
genuinely changes between enqueue and dispatch. A guest's session does not change; snapshotting a
stable fact is not the same as snapshotting a volatile one.

**D7 — `UncompleteTransaction` deletes the outbox row, so re-completing notifies again.**
`docs/prd-kds-order-notifications.md` D4 chose the opposite for the KDS — unpay-then-repay does not
re-notify, because the correction is to the money and the bar was already told. The guest case
inverts that. A barista who marks order #12 ready by mistake and immediately un-marks it has told
the guest something false; if the outbox row survives, the guest gets the wrong notification and
then **never gets the real one**, because the unique key suppresses it. Deleting the row on
uncomplete makes the correction complete. The cost is a guest who might receive two notifications
for one order, which is a mild annoyance against a silent failure of the entire feature for that
order.
*Alternative rejected:* leaving the row and letting the poll catch up. It only helps a guest who
still has the page open, which is the population this PRD exists to stop relying on.

**D8 — Permission is requested on an explicit tap on the preparing screen, never on page load and
never before payment.**
Neither Chrome nor Safari shows a second permission prompt after a denial; the guest must go into
browser settings, which they will not. So the prompt gets exactly one chance, and it should be spent
at the moment the guest has a reason to say yes — staring at *"Sedang disiapkan"* with nothing to
do. Chrome additionally requires a user gesture for `Notification.requestPermission()` on mobile.
*Alternative rejected:* asking at checkout, before payment. It competes for attention with a payment
the venue actually needs to complete, and it would ask guests who are about to abandon the cart.

**D9 — Push is additive; the polling loop is not removed, reduced or gated on it.**
`OrderStatusUsecase`'s 10-second interval stays exactly as written. It is the only thing that works
for a guest on iOS Safari in a tab (D12), a guest who declined the permission, a guest on a browser
without `PushManager`, and — crucially — a guest who *is* looking at the page, where a notification
is not what should update the UI. Deleting the poll would trade a feature that works for everyone
for one that works for some.

**D10 — A `404` or `410 Gone` from the push service soft-deletes the subscription.**
These are the Web Push protocol's definitive *"this subscription is dead"* responses — the browser
was uninstalled, site data was cleared, or the push service expired it. Every other status is
transient and retried. This mirrors `docs/prd-kds-order-notifications.md` D18's handling of Expo's
`DeviceNotRegistered`, and it is what stops a guest-facing table from accumulating dead rows
forever, since unlike staff phones, guest browsers are never deliberately unregistered.

**D11 — The service worker shows a notification on every push, unconditionally.**
Chrome enforces the `userVisibleOnly: true` contract a subscription is created under: a `push`
handler that resolves without calling `showNotification` gets the browser's own generic *"This site
has been updated in the background"* notification, and repeated offences can revoke the
subscription. So there is no *"suppress it if the guest already has the page open"* branch. The
`tag` field carries the de-duplication instead: a redelivery replaces the existing notification
rather than stacking beside it.

**D12 — iOS requires the order app to be installed to the Home Screen, and the UI says so rather
than failing.**
This is the largest constraint in the PRD and it is not solvable in code. On iOS and iPadOS, Web
Push has been available since 16.4 but **only to web apps launched from the Home Screen** — Safari
in a tab has no `PushManager` at all. The app must therefore ship a
`manifest.webmanifest` with `display: standalone` and a 192px icon, and the opt-in card must detect
iOS-not-standalone (`navigator.standalone === false` with no `PushManager`) and render *Share →
Tambahkan ke Layar Utama* instructions instead of a dead button.
Three things bound the damage: Android Chrome, which is the majority browser for this audience, has
no such restriction; the install flow is one the local audience already knows from other Indonesian
web apps; and D9 means an iOS guest who does not install anything is exactly as well served as they
are today.
*Alternative rejected:* Safari 18.4's Declarative Web Push, which delivers a notification from a
JSON payload with no service worker. It is Apple-only, so it is a second delivery path to build and
maintain beside the one Android needs, and it does not lift the Home Screen requirement.

**D13 — Browser push APIs are reached only through `WebPushRepository`, implemented in
`data/browser/`.**
Permission status, subscription and service-worker registration are device capabilities, which makes
them a repository in this architecture, not a hook in a handler — `docs/prd-kds-order-notifications.md`
D13 applied to a browser instead of a phone. It is also the only way the FSM is testable: `libs/ui`'s
Jest config stubs `react-native`, `tamagui`, `solito` and `next/router`, and its environment has no
`navigator.serviceWorker`, no `PushManager` and no `Notification`. `MockWebPushRepository` with a
settable permission status and a settable support flag drives every branch, including
`needsInstall`.
The interface reuses `PermissionStatus` from `domain/repositories/pushToken.ts` rather than
declaring a second identical union.

**D14 — No changes to the `Payment` or `Transaction` API contract.**
The notification is a server-side effect of completion. `fulfillmentStatus` already exists on
`Payment` (`api.yaml:5088`) and is what the page derives `ready` from, so there is nothing new for a
client to read. Three new schemas are added, none of them touching an existing one — no
regeneration risk for `apps/pos-web` or `apps/pos-mobile`, and no new field needed in
`libs/ui/src/__mocks__/api-contract.ts` on the transaction or payment path.

**D15 — Everything lands in the existing `@gatherloop-pos/ui/order` graph; no new export surface.**
`docs/prd-kds-order-notifications.md` D11 created `@gatherloop-pos/ui/kds` because a KDS is a
different app with a different bundle. This is the same app, one card on a screen it already has, so
`libs/ui/.eslintrc.json` gains no new block and `tsconfig.base.json` no new path. The opt-in use
case is owned by the existing `OrderStatusHandler`, not promoted to
`presentation/handlers/hooks/` — `docs/handlers.md`'s promotion rule is two handlers, and there is
one.

**D16 — Guest copy is Indonesian, staff copy stays English.**
`views/screens/order/**` is Indonesian and `views/screens/pos/**` is English
(`docs/prd-order-fulfillment-status.md` D15). Everything this PRD adds to the guest surface —
notification title, body, opt-in card, iOS install instructions — is Indonesian. The outbox's
`detail` strings are English, because they are operator diagnostics, like `kds_notifications.detail`.

**D17 — The transport types live in their own `domain/web_push_gateway_repository.go`, not with the
subscription or the outbox.**
`WebPushMessage`, `WebPushReceipt` and `WebPushGatewayRepository` describe *how a push is sent* and
have no opinion about who is subscribed or why. Putting them beside `WebPushSubscription` would
make the gateway phase depend on the subscription phase; putting them beside `GuestNotification`
would invert it. Either way two phases that share nothing at runtime become serial for the sake of
a type declaration. The split is what lets phases 1 and 2 be written at the same time
(*Phase dependencies*).
*This is a deliberate departure from the existing convention, and the only one in this PRD.* Both
gateway interfaces in `apps/api` today share a file with a data repository —
`PaymentGatewayRepository` sits with `PaymentRepository` in `domain/payment_repository.go:17`, and
`KdsPushGatewayRepository` with `KdsNotificationRepository` and `KdsPushMessage` in
`domain/kds_notification_repository.go:36`. Neither had a reason not to: each was written in one
phase alongside the repository it shares with. Here the two land in different PRs, so the file
boundary is doing work the existing ones never had to do. If a reviewer prefers consistency over
the parallelism, the cost is exact and small: phases 1 and 2 merge in order instead of together,
and wave 1 becomes two phases rather than three.

---

## Phased plan

Nine phases, each one PR, each leaving `main` green and the product shippable. Phases 1–5 are API
only and ship no guest-visible change; a guest sees nothing until phase 8.

### Phase 1 — Subscription table, contract and endpoints (API)

Migration `000033_create_web_push_subscriptions`. `WebPushSubscription` entity;
`WebPushSubscriptionRepository` with its MySQL implementation, transformer and generated mock;
`WebPushSubscriptionUsecase` (subscribe upserting on `endpoint`, unsubscribe soft-deleting, list by
session); the three contract schemas and operations; `web_push_subscription_{handler,route,transformer}.go`
wrapped in `RequireSessionId`; the config route added to `public_route.go`/`public_handler.go`;
`WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` and `WEB_PUSH_SUBJECT` in `utils/env.go`
and `.env.example`. Wiring in `main.go`. Nothing sends anything.

**Acceptance:** `web_push_subscription_usecase_test.go` covers subscribe, re-subscribe with the same
endpoint (one row, `last_seen_at` stamped), a malformed endpoint, unsubscribe, and unsubscribe of an
endpoint belonging to another session (no-op, not an error);
`web_push_subscription_handler_test.go` covers the three routes plus a missing `X-Session-Id`;
`MIGRATIONS_DIR=data/mysql/migrations make migrate-up && make migrate-down` clean both ways;
`npx nx run api-contract:generate:go && npx nx run api:test` green.

### Phase 2 — The Web Push gateway (API)

`WebPushGatewayRepository`, `WebPushMessage` and `WebPushReceipt` in their own
`domain/web_push_gateway_repository.go` (D17)
(`Send(ctx, []WebPushMessage) ([]WebPushReceipt, *Error)`), implemented in
`data/webpush/web_push_repo.go` against `github.com/SherClockHolmes/webpush-go`, structured exactly
like `data/expopush/kds_push_repo.go`. VAPID keys read from env; a `TTL` of 900 seconds and
`Urgency: high` on every message. Response status mapped to a receipt: `2xx` → ok, `404`/`410` →
`WebPushErrorCodeGone`, everything else → a transient error carrying the status.

**Acceptance:** a repository test over an `httptest` server asserts the request headers
(`Authorization: vapid …`, `Content-Encoding: aes128gcm`, `TTL`, `Urgency`), that the body is
ciphertext rather than the plaintext payload, and that `410` maps to `WebPushErrorCodeGone`; a
keypair generated by `webpush.GenerateVAPIDKeys()` is documented in `.env.example` with the command
that produces it; `npx nx run api:test` green. Nothing can be sent to a real browser until phase 8
supplies a genuine subscription — that is phase 8's acceptance, not this one's.

### Phase 3 — The outbox table and the message rule (API)

Migration `000034_create_guest_notifications`. `GuestNotification`, `GuestNotificationStatus`
(`pending | sent | failed | skipped`), and the pure
`BuildGuestPushMessage(Transaction, reference string) WebPushMessage` (FR-5);
`GuestNotificationRepository` (enqueue, claim pending, mark sent/failed/skipped, delete by
transaction) with its MySQL implementation and generated mock;
`PaymentRepository.GetPaymentByTransactionId` and its implementation, since it does not exist today.
**Nothing calls any of it yet** — this phase is the rules and their storage, reviewed on their own.

**Acceptance:** a message-building test asserts the title carries `transactionNumber` (not the row
id), that the body carries the table label when there is one and the customer name when there is
not, and that `tag` is `order-{reference}`; a repository test asserts a duplicate enqueue leaves one
row and that delete-by-transaction removes it; `make migrate-up`/`make migrate-down` clean;
`npx nx run api:test` green.

### Phase 4 — Enqueue on completion, delete on uncompletion (API)

`CompleteTransaction` gains the `GuestNotificationRepository` dependency and the
`EnqueueForCompletedTransaction` call inside its existing `BeginTransaction` callback;
`UncompleteTransaction` gains the delete (D7); `main.go` passes the dependency. Rows are written and
nothing dispatches them, so the observable behaviour is a growing `pending` table.

**Acceptance:** `transaction_usecase_test.go` asserts that completing an order transaction enqueues
one row carrying the payment's `session_id`, that completing a transaction with no payment row
enqueues one `skipped` row rather than failing, that completing twice still yields one row, that a
non-`order` transaction is rejected before the enqueue is reached, and that uncompleting removes the
row so a second completion enqueues a fresh one; every existing completion test passes untouched;
`npx nx run api:test` green.

### Phase 5 — The dispatcher (API)

`GuestNotificationUsecase.DispatchPending` and `TriggerDispatch` per FR-4;
`runKdsDispatchSweeper` renamed `runNotificationSweeper` and driving both outboxes (D5); the
post-commit goroutine kick in `CompleteTransaction`. Structured `slog` lines on every send, failure
and subscription prune, matching the KDS dispatcher's fields.

**Acceptance:** use-case tests over the mock gateway cover success on every subscription, partial
success (one accepts, one fails → row is `sent`, the failure in `detail`), total failure
(`attempt_count` increments, row stays `pending`), exhaustion at five attempts (`failed`), a `410`
(that subscription soft-deleted), no subscriptions for the session (`skipped` with
`detail = 'no active subscription for session'`), and that a `skipped` row is never re-claimed; a
test asserts the sweeper calls both dispatchers per tick; `npx nx run api:test` green.

### Phase 6 — Service worker, manifest and icons (apps/order-web)

`public/sw.js` with its two listeners (D4, D11); `public/manifest.webmanifest`
(`display: standalone`, `start_url: /`, `theme_color` matching `_document.tsx`'s `#f8f8f8`);
`public/icons/icon-192.png` and `icon-512.png` derived from `public/brand/logo.webp`;
`<link rel="manifest">` and `<link rel="apple-touch-icon">` in `src/pages/_document.tsx`; a
`headers()` block in `next.config.js` setting `Cache-Control: no-cache` on `/sw.js` and the
manifest. No registration code and no React changes — the worker is inert until phase 7's repository
registers it.

**Acceptance:** `npx nx run order-web:build` green; the dev server serves `/sw.js` with
`Cache-Control: no-cache`; Chrome DevTools → Application shows the manifest as installable; on an
iPhone, *Share → Add to Home Screen* produces a standalone launcher with the venue icon — the
prerequisite D12 rests on, verified before anything depends on it.

### Phase 7 — Frontend domain slice (libs/ui)

No UI. `WebPushSubscription.ts` and `WebPushConfig` entities; the `WebPushRepository` (browser) and
`WebPushSubscriptionRepository` (API) interfaces; `data/api/webPushSubscription.ts` + transformer;
`data/browser/ServiceWorkerWebPushRepository.ts` — the only file touching `navigator.serviceWorker`,
`PushManager` and `Notification`, and the place `navigator.serviceWorker.register('/sw.js')` is
called lazily from `subscribe()`; `data/mock/webPush.ts` and `webPushSubscription.ts` with
`setShouldFail`, a settable permission status and a settable support flag;
`OrderNotificationSubscribeUsecase` as an FSM per FR-6; barrel exports in every touched `index.ts`.

**Acceptance:** `orderNotificationSubscribe.test.ts` drives supported/granted, denied,
unsupported, `needsInstall`, subscribe-error and unsubscribe paths with `UsecaseTester` +
`flushPromises`; a test asserts the use case never references a global `navigator`;
`npx nx run ui:test` green; the use case reachable from `@gatherloop-pos/ui`.

### Phase 8 — The opt-in card (libs/ui + apps/order-web)

`OrderNotificationOptIn.tsx` + `.stories.tsx` in `views/components/orderStatus/`, covering every FSM
state including the iOS install instructions; rendered by `OrderPreparingView` and not by
`OrderReadyView` (FR-7); `OrderStatusHandler` gains the second use case and maps its state onto the
card's props; `app/order/OrderStatus.tsx` news up `ServiceWorkerWebPushRepository` and
`ApiWebPushSubscriptionRepository`. **This is the phase where the feature becomes real** — the first
push a browser can actually receive.

**Acceptance:** Storybook shows the card in idle, denied, needs-install, subscribing, subscribed and
error states; an `OrderStatusHandler.test.tsx` case over `MockWebPushRepository` +
`MockWebPushSubscriptionRepository` asserts that tapping the CTA with permission granted reaches the
subscribed confirmation, that a denied permission renders the settings line, and that an unsupported
browser renders no card at all; `npx nx run ui:lint` and `npx nx run ui:test` green.
**End to end on staging:** an Android Chrome guest pays, taps **Beri tahu saya**, backgrounds the
browser and locks the phone; a staff member marks the order ready in the POS; the phone buzzes
within five seconds with `Pesanan #N siap diambil!` and tapping it opens `/orders/{reference}`
already showing the ready state. Repeated on an iPhone with the app installed to the Home Screen —
**a locked, backgrounded phone is the pass condition, foreground is not** (Risks).

### Phase 9 — Documentation and coverage

A `docs-site/sales/order-notifications.md` page, next to `table-ordering.md` in the same sidebar
group (`docs-site/.vitepress/config.ts`) — what the guest notification is, what the guest has to tap, the iOS
Home Screen requirement written for an operator explaining it to a customer, and what to check when
a guest says they got nothing — plus its sidebar entry. `apps/api/.env.example` and `README.md` gain
the three VAPID variables and the key-generation command. An `order-web-e2e` spec (Playwright,
`context.grantPermissions(['notifications'])`) asserting that the opt-in card appears on the
preparing screen, that tapping it reaches the subscribed state, and that a `POST
/web-push/subscriptions` row exists for the session afterwards.

**Acceptance:** `npx nx run order-web-e2e:e2e` passes locally — CI runs Playwright post-merge only
(`.github/workflows/e2e-main.yml`), so local is the gate; the docs page renders in
`npx nx run docs-site:dev`.

---

## Phase dependencies

The phases are numbered in a defensible merge order, not a required one. Three of the nine depend
on nothing and can start on day one.

A dependency is **hard** when the phase does not compile or its tests do not pass without the
other, and **soft** when it builds and tests green on its own but its stated acceptance check or a
clean merge wants the other first. Only hard dependencies constrain who can work in parallel; soft
ones constrain what order the PRs land in.

| # | Phase | Hard deps | Soft deps | Primary files it owns |
| --- | --- | --- | --- | --- |
| 1 | Subscription table, contract, endpoints (API) | — | — | `api.yaml`, migration `000033`, `domain/web_push_subscription_{entity,repository,usecase}.go`, `data/mysql/web_push_subscription_*`, `presentation/restapi/web_push_subscription_*`, `public_{route,handler}.go`, `utils/env.go` |
| 2 | Web Push gateway (API) | — | 1 *(VAPID vars declared there)* | `domain/web_push_gateway_repository.go`, `data/webpush/web_push_repo.go` |
| 3 | Outbox table, message rule (API) | 2 *(`WebPushMessage`)* | — | migration `000034`, `domain/guest_notification_{entity,repository}.go`, `data/mysql/guest_notification_*`, `domain/payment_repository.go` |
| 4 | Enqueue on completion (API) | 3 | — | `domain/transaction_usecase.go` |
| 5 | Dispatcher (API) | 1, 2, 3 | 4 *(edits the same function)* | `domain/guest_notification_usecase.go`, `main.go` sweeper |
| 6 | Service worker, manifest, icons | — | — | `apps/order-web/public/**`, `_document.tsx`, `next.config.js` |
| 7 | Frontend domain slice (libs/ui) | 1 *(generated TS client)* | 6 *(runtime only)* | `domain/entities/WebPushSubscription.ts`, `domain/repositories/webPush*.ts`, `domain/usecases/orderNotificationSubscribe.ts`, `data/api/webPushSubscription*`, `data/browser/**`, `data/mock/webPush*` |
| 8 | The opt-in card (libs/ui + order-web) | 6, 7 | 5 *(end-to-end acceptance)* | `views/components/orderStatus/OrderNotificationOptIn.tsx`, `OrderPreparingView.tsx`, `OrderStatusHandler.tsx`, `app/order/OrderStatus.tsx` |
| 9 | Documentation and coverage | 8 | — | `docs-site/sales/order-notifications.md`, `apps/order-web-e2e/**` |

### What can run in parallel

Six waves, not nine. With two or three people the calendar is six PRs deep, not nine:

| Wave | Phases | Why they don't collide |
| --- | --- | --- |
| 1 | **1, 2, 6** | Three disjoint file sets: the subscription slice, the transport package, and `apps/order-web`'s static assets. No shared symbol, no shared directory. |
| 2 | **3, 7** | 3 is Go and needs only phase 2's message type; 7 is TypeScript and needs only phase 1's regenerated client. Different languages, different halves of the repo. |
| 3 | 4 | Alone — it edits `CompleteTransaction`. |
| 4 | 5 | Alone — it edits `CompleteTransaction` again, and needs 1, 2 and 3. |
| 5 | 8 | Alone — it is the integration point, and the first phase a guest can see. |
| 6 | 9 | Alone — its e2e spec drives phase 8's card. |

**The critical path is 2 → 3 → 4 → 5 → 8 → 9**, six phases long. Phases 1, 6 and 7 are off it
entirely, which means the whole subscription-and-client track has slack: it must simply be done
before phase 8, not before phase 5.

Three notes for whoever sequences the PRs:

- **`main.go` is the one file several phases touch** (1, 2, 4 and 5 each add wiring). The additions
  are append-only constructor lines next to the existing `kds*` block, so a conflict there is
  mechanical rather than semantic — but it is the reason two parallel phases should not both sit
  unmerged for a week.
- **Phases 4 and 5 both edit `CompleteTransaction`** — 4 adds the enqueue inside
  `BeginTransaction`, 5 adds the `TriggerDispatch()` kick after the commit. That textual overlap,
  not a compile dependency, is why 5 is listed soft-dependent on 4 and why neither is parallelised.
- **Phase 2's soft dependency on phase 1 is one line.** Phase 1 declares all three
  `WEB_PUSH_*` variables in `utils/env.go` because they are one credential set and belong together
  in `.env.example`, and phase 1 needs the public half for its config endpoint. If phase 2 lands
  first it adds the private key and subject itself, and phase 1 drops to declaring one variable.
  Either order works; nobody is blocked.

If only one person is building this, the numbered order is still the right one to merge in — it is
a topological sort of the table above, and each phase's acceptance check is satisfiable at the
moment it lands.

---

## Risks

**iOS guests must install the app to the Home Screen, and most will not.** The defining risk. Web
Push on iOS is unavailable to Safari tabs — only to home-screen web apps — and the install is a
manual three-tap flow with no browser prompt. A meaningful share of iOS guests will therefore never
receive a notification. Mitigations: D9 keeps polling for exactly this population, so they are no
worse off than today; D12 makes the UI explain the install instead of showing a dead button; and the
docs-site page (phase 9) gives staff the words to explain it. Not fully solvable — the honest
long-term answer is Option B (SMS) as a second channel, which this design leaves additive. Worth
measuring: the ratio of `sent` to `skipped` rows in `guest_notifications`, split by user agent, is
the number that says whether to build it.

**A `201` from the push service is not a delivery.** Unlike Expo, which returns per-token receipts
(`docs/prd-kds-order-notifications.md` D18 leans on them), Web Push gives the sender no delivery
confirmation — only that the message was accepted for relay. `guest_notifications.status = 'sent'`
therefore means *we handed it over*, not *the guest saw it*, and there is no server-side way to tell
the two apart. Stated plainly so nobody reads the outbox as proof of delivery during a support
conversation.

**Aggressive battery savers delay or drop pushes.** Android OEM power management — Xiaomi, Oppo,
Vivo and Samsung are the relevant ones for this audience — routinely restricts background delivery
for browsers. `Urgency: high` and a 900-second `TTL` give the message the best chance and a bounded
lifetime, but a phone in deep doze may deliver late or not at all. This is the same class of risk
`docs/prd-kds-order-notifications.md` records for the KDS phone, with less leverage: a guest's phone
is not a device the venue configures.

**The guest declines the permission, permanently.** There is no second prompt on any browser. D8
spends the single prompt at the best available moment, and the card explains what it is for before
the OS dialog appears, but a mistaken tap on "Block" costs that guest the feature until they change
a browser setting. The `permissionDenied` state renders the instruction; nothing else can be done.

**A session that loses its cookie loses its subscription.** `gl_session_id` lives in a cookie
mirrored into `localStorage` (`CookieSessionRepository`). A guest who clears site data, switches
browsers or opens the order in a private window gets a new session and no subscriptions, so a
completion for the old session pushes to a browser that is no longer watching. The orphan is pruned
on its next `410` (D10); the guest re-opts-in with one tap. Bounded, and the same trade-off order
history already makes.

**VAPID key rotation invalidates every existing subscription.** A subscription is bound to the
`applicationServerKey` it was created with. Rotating the keypair silently breaks every stored
subscription — pushes return `403`, the dispatcher retries five times and marks rows `failed`. D3's
config endpoint means new subscriptions pick up the new key automatically, but existing rows must be
truncated as part of any rotation. Documented in phase 9; the keypair should be treated as
long-lived credentials, backed up with the rest of the API's environment.

**A single API instance is assumed.** Inherited unchanged from
`docs/prd-kds-order-notifications.md` D6 — the sweeper has no cross-process claim, so two API
instances would each pick up the same pending rows. The unique key prevents duplicate rows, not
duplicate sends. Current deployment is one systemd unit on one VPS. If that changes, the claim step
in *both* outboxes needs `SELECT … FOR UPDATE SKIP LOCKED`.

**A stale service worker serves stale push behaviour.** A browser may hold a cached `sw.js` for up
to 24 hours, so a change to the notification's shape does not reach every guest immediately. D4's
`Cache-Control: no-cache` header is the mitigation; the residual risk is that the worker is only
re-checked on navigation, so a guest who never reopens the app keeps the old one. Acceptable — the
worker's contract is two event names and a JSON shape, and phase 3's payload is versioned by nothing
because it has no reason to change.

**Notification fatigue is not a risk here, and that is worth stating.** One notification per order,
only on ready, only to a guest who explicitly asked for it. This is the opposite position from
`docs/prd-kds-order-notifications.md`'s D24, whose accepted cost was buzzing every staff phone for
every order — and the difference is that a guest opted in for exactly one event.

---

## Out of Scope

| Not doing | Why |
| --- | --- |
| **SMS or WhatsApp fallback** | Option B. Needs a phone number at checkout, a gateway vendor and per-message cost. The right second channel once push's coverage is measured (Risks), and nothing here blocks it. |
| **Notifying on payment confirmed** | Option G, D1. The guest is looking at the screen at that moment. |
| **"Your order is taking longer than usual"** | Option H. Needs a preparation-time model the system does not have. |
| **Web push to `apps/pos-web`** | `docs/prd-kds-order-notifications.md` already declined it: a surface staffed by someone looking at it. The KDS app is the staff channel. |
| **Safari Declarative Web Push** | D12. Apple-only, a second delivery path to maintain, and it does not lift the Home Screen requirement. |
| **Notification actions ("Sudah diambil", "Belum siap")** | An action button needs an endpoint for the guest to confirm pickup, which is a fulfilment-model change, not a notification one. |
| **A full offline PWA** | D4. The app is server-rendered per request with a session cookie; caching pages would serve one guest another's order. The manifest exists for the iOS install requirement, not for offline. |
| **Retention sweep of old subscriptions** | Pruning happens on `410` (D10), which covers the real failure mode. A time-based sweep is a cron job for a table that will hold hundreds of rows, not millions. Revisit if it grows. |
| **Per-guest notification preferences** | There is one notification. A preference screen for a single on/off toggle that already exists on the card is a settings page for nothing. |
| **Delivery analytics / open rates** | Web Push gives the sender no receipt (Risks). Measuring this properly means client-side reporting from the service worker — a separate, and much smaller, PRD. |
| **Reusing the outbox for both channels in one table** | A `channel` column on `kds_notifications` would merge two features with different triggers, recipients, transports and lifecycles for the sake of one shared status enum. The shape is copied; the table is not. |
| **Recording which staff member marked the order ready** | `CheckAuth` discards JWT claims — the same limitation `docs/prd-order-fulfillment-status.md` and `docs/prd-kds-order-notifications.md` D10 both record. Unchanged here. |

---

## Open Questions

1. **Should the opt-in card also appear on the menu or cart screen, before checkout?** D8 says no —
   the prompt gets one chance and it should be spent while the guest is waiting. But a guest who
   subscribes *before* paying is subscribed for every future order too, which compounds. Worth
   revisiting once phase 8's opt-in rate is visible.
2. **What should happen to a `failed` row?** Today it stops after five attempts and sits there for a
   human to find. There is no operator surface that shows it. Is a POS screen listing failed guest
   notifications worth building, or is the `SELECT` enough at this venue's volume?
3. **Is the iOS install flow worth actively promoting** — a dismissible banner on the menu screen
   inviting the guest to add the app to their Home Screen — or does that belong to a separate PWA
   PRD with its own justification beyond notifications?

---

## Success Criteria

1. A guest pays at a table, taps **Beri tahu saya**, locks their phone and opens Instagram. When the
   barista marks the order ready, the phone buzzes within five seconds showing
   `Pesanan #12 siap diambil!`, and tapping it opens the order page already in the ready state.
2. A guest who declines the notification, or is on iOS Safari in a tab, sees exactly the experience
   they see today — the polling status page, unchanged, with no broken button and no error.
3. An iOS guest who has added the app to their Home Screen gets the same notification an Android
   guest does.
4. The venue holds no push-provider account, no service-account credential and no third-party script
   on a guest-facing page. `apps/order-web` calls no push vendor directly.
5. A barista who marks the wrong order ready can un-mark it and mark the right one, and the right
   guest is the one who gets notified.
6. When a guest reports never getting a notification,
   `SELECT * FROM guest_notifications WHERE transaction_id = ?` says whether it was enqueued,
   attempted, handed to a push service, or skipped for want of a subscription — and `detail` says
   why.
7. Completion behaviour is unchanged: every existing `transaction_usecase_test.go` completion case
   passes untouched, and a push-service outage cannot fail or roll back a completion.
8. The ratio of `sent` to `skipped` rows, split by `user_agent`, is answerable from the database on
   day one — because that number is what decides whether SMS (Option B) gets built.

---

## Sources

- RFC 8030 — Generic Event Delivery Using HTTP Push (the push service protocol, `TTL` and `Urgency`
  headers): https://datatracker.ietf.org/doc/html/rfc8030
- RFC 8291 — Message Encryption for Web Push (`aes128gcm`, the `p256dh` and `auth` keys):
  https://datatracker.ietf.org/doc/html/rfc8291
- RFC 8292 — VAPID for Web Push (the self-signed application server identification D2 rests on):
  https://datatracker.ietf.org/doc/html/rfc8292
- MDN — Push API and `PushManager.subscribe()`, including `userVisibleOnly` (D11):
  https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN — `ServiceWorkerRegistration.showNotification()` options (`tag`, `renotify`,
  `requireInteraction`): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- Chrome for Developers — the `userVisibleOnly` contract and the browser's own "site updated in the
  background" notification (D11): https://developer.chrome.com/docs/capabilities/web-apis/web-push-notifications
- Apple — Web Push for Home Screen web apps on iOS/iPadOS 16.4+, and Declarative Web Push in Safari
  18.4 (D12): https://webkit.org/blog/12945/meet-web-push/
- Pushpad — iOS's special requirements for web push, including that a Safari tab has no
  `PushManager` (D12): https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications
- MagicBell — PWA iOS limitations and Safari support, 2026 state of play (D12):
  https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- `SherClockHolmes/webpush-go` — the Go implementation of RFC 8291 encryption and RFC 8292 signing,
  and `GenerateVAPIDKeys()` (D2, phase 2): https://github.com/SherClockHolmes/webpush-go
- MDN — service worker lifecycle and the 24-hour cap on script caching (D4's `Cache-Control`
  reasoning): https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
