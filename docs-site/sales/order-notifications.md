# Guest Order-Ready Notifications

## What it does

While an order is being made, the guest's [order status page](/sales/order-checkout) shows a card
offering to notify them the moment it's ready:

```
🔔  Tidak perlu menunggu di halaman ini
    Kami beri tahu saat pesanan siap.
             [ Beri tahu saya ]
```

A guest who taps **Beri tahu saya** and allows the browser's notification permission gets a real
push notification — sound, vibration, lock-screen entry — the instant a staff member marks their
order ready in the POS, whether or not the guest still has the order page open. Nothing has to be
installed and no phone number is collected; the browser itself remembers the guest's phone for as
long as it's subscribed. The card disappears once the guest has subscribed, replaced by a one-line
confirmation with a **Matikan** (turn off) button, and it never reappears on the ready screen — its
moment has passed.

## Why it matters

Before this, the only way a guest knew their order was ready was to keep the status page open and
watch it refresh — which stops working the moment the guest locks their phone, switches apps, or
the browser tab gets backgrounded. In practice that meant guests either stood there watching a
spinner or wandered back to the counter to ask, which is exactly the interaction
[table ordering](/sales/table-ordering) was built to remove. This closes that gap for the guest the
same way the [Kitchen Display System](/sales/kds) already closed it for staff — a push notification
that arrives whether or not anyone is looking at a screen.

## The iOS Home Screen requirement

This is the one thing worth explaining to a guest before they ask why the button "didn't work":

- **On Android**, the notification button works in the browser exactly as it looks — no install,
  no extra step. This covers the majority of guests.
- **On iPhone, push notifications only work if the order page has been added to the Home Screen
  first.** Apple doesn't allow a Safari tab to receive push notifications at all — only a page
  that's been installed as its own icon. If a guest opens the page in Safari and doesn't add it to
  their Home Screen, the opt-in card shows install instructions instead of a button:

  > Tambahkan halaman ini ke Layar Utama untuk mendapat notifikasi saat pesanan siap: ketuk tombol
  > Share lalu pilih "Tambahkan ke Layar Utama".

  In plain terms for a guest who asks: *tap the Share icon at the bottom of Safari, then "Add to
  Home Screen." Open the app from that new icon instead of the browser, and the notification button
  will work from there.*
- **A guest who doesn't want to do that is no worse off than before this feature existed** — the
  status page still refreshes on its own every few seconds while it's open. The notification is a
  bonus for a guest who's about to walk away from their phone, not a replacement for the page.

## If a guest says they got nothing

1. **Confirm they actually tapped "Beri tahu saya" and allowed the permission prompt.** If they
   dismissed or denied the OS permission dialog, the card now reads "Notifikasi dinonaktifkan" with
   no way to re-prompt — the guest has to re-enable notifications for the site in their own browser
   settings. There's no second in-app prompt on any browser once it's been denied once.
2. **If they're on iPhone, ask whether they added the page to their Home Screen first** — see
   above. A guest using the order page from a plain Safari tab was never able to subscribe in the
   first place, whatever the card showed them.
3. **The order still has to actually be marked ready.** A push notification is a side effect of the
   same **Mark as ready** action described in
   [Order Fulfilment Status](/sales/order-checkout) — if the transaction hasn't been completed yet,
   there's nothing to notify about.
4. **A push notification is "handed to Google/Apple for delivery," not a delivery receipt.** Once
   in a while a phone's battery saver or a brief push-service outage delays or drops a notification
   entirely — the guest's status page is always the fallback of record, and it will show "ready"
   regardless of whether the notification arrived.
5. **A guest who cleared their browser data or switched browsers loses their old subscription
   silently.** They just need to tap **Beri tahu saya** again on their current visit — it's a
   one-tap re-opt-in, not a lost feature.

## Key capabilities

- **No install, no phone number, no account.** One tap, on a page the guest is already on.
- **Arrives even when the guest has walked away** — a locked phone, a backgrounded browser and a
  closed tab don't stop it, unlike the page's own auto-refresh.
- **One notification per order, only when it's actually ready** — a guest who opts in is never
  notified about anything else.
- **Turn off any time** — the confirmation card's **Matikan** button unsubscribes immediately.
- **Works alongside the status page, not instead of it** — a guest who still has the page open just
  sees it update; the notification changes nothing about how the page itself behaves.

## For engineers

- Guest-facing opt-in card: `libs/ui/src/presentation/views/components/orderStatus/OrderNotificationOptIn.tsx`,
  rendered from `OrderPreparingView.tsx` and wired through
  `libs/ui/src/presentation/handlers/order/OrderStatusHandler.tsx`
- Frontend use case (a finite state machine, not a hook):
  `libs/ui/src/domain/usecases/orderNotificationSubscribe.ts`
- Browser push capability, behind an interface so tests never touch `navigator`:
  `libs/ui/src/domain/repositories/webPush.ts`, implemented in
  `libs/ui/src/data/browser/ServiceWorkerWebPushRepository.ts`
- Service worker, manifest and icons (the iOS Home Screen prerequisite):
  `apps/order-web/public/sw.js`, `apps/order-web/public/manifest.webmanifest`
- Backend trigger: `TransactionUsecase.CompleteTransaction` (`apps/api/domain/transaction_usecase.go`) —
  the same **Mark as ready** action described in [Order Fulfilment Status](/sales/order-checkout)
- Backend outbox and dispatcher: `apps/api/domain/guest_notification_{entity,repository,usecase}.go`,
  tables `web_push_subscriptions` and `guest_notifications` (migrations `000033`/`000034`), driven by
  the same sweeper that already drives the KDS outbox (`runNotificationSweeper`, `apps/api/main.go`)
- Delivery gateway: `apps/api/data/webpush/web_push_repo.go`, signed with VAPID
  (`WEB_PUSH_VAPID_PUBLIC_KEY`/`WEB_PUSH_VAPID_PRIVATE_KEY`/`WEB_PUSH_SUBJECT` in `apps/api/.env`,
  generated with `go run ./cmd/generatevapidkeys` from `apps/api`)
- Design doc: `docs/prd-order-web-push-notifications.md` — why completion (not payment) is the
  trigger (D1), why the subscription is keyed to the guest's session rather than the order (D6/D7),
  and why iOS's Home Screen requirement can't be worked around in code (D12)
