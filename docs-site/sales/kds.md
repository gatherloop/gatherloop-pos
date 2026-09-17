# Kitchen Display System (KDS)

## What it does

The KDS app is a second, dedicated phone that sits on the bar or in the kitchen and buzzes the
moment a transaction is paid — at the counter or from a guest's [table order](/sales/table-ordering).
It has exactly two screens: log in with the same staff credentials used everywhere else, then set
up the device with a name ("Andi's phone", "Counter tablet"). Once registered, the app's whole job
is to sit there — open or closed, screen on or off — and let a push notification land with sound
and vibration whenever an order comes in. There's no order queue or ticket list in this app; that's
read off the [Transactions](/sales/transactions) list or the printed order slip, the same way it is
today.

## Why it matters

Before this, nothing told the bar or the kitchen that an order had arrived. A guest paying from
their table via QRIS gets no counter interaction and no verbal handoff at all — the paid
transaction just sits in the database until someone happens to look at the POS or remembers to
print the slip. The KDS app closes that gap the way every delivery-app merchant tablet already
does: push notification, loud, on a phone that stays on the counter — not "the cashier will
notice."

## How a payment becomes an alert

Every transaction — POS or table order — routes through the same [station](/catalog/categories)
tagging that already splits the printed order slip into **Bar** and **Kitchen** sections:

- **A transaction with at least one `Bar` or `Kitchen` item notifies.** The moment it's marked
  paid, every registered KDS phone buzzes once — this venue's two staff usually split the bar and
  the kitchen, but sometimes both cover the bar, so one alert to every phone means nobody is ever
  silently left out of a station nobody claimed.
- **A transaction whose items are all in a `None`-station category — a board-game ticket, a
  deposit — notifies nobody.** Nothing has to be made, so nothing summons anyone. This is exactly
  the same rule that already decides whether a category shows up on the printed slip; get the
  station right once on the [Categories](/catalog/categories) screen and both surfaces agree.
- **A sale settled the next business day doesn't notify.** A cashier closing out yesterday's tab
  this morning shouldn't buzz the bar for a "new" order that isn't one.

### Reading the alert

One notification, shared identically by every phone, with the items grouped under the station
that's actually theirs:

```
New order #12 — Table 4
BAR: 2× Kopi Susu Gula Aren, 1× Americano · KITCHEN: 1× Sandwich
```

- The **number** is the same daily transaction number already printed on the slip and shown on
  the guest's own order-status page — whatever the staff member calls out, it's what everyone else
  is already looking at.
- The line after it is grouped **Bar, then Kitchen** — a coffee-only order still says `BAR: …` so
  reading "not mine" takes the same half-second as reading "mine."

## Setting up a phone

1. Install the KDS app on the dedicated phone and log in with a staff account — the same username
   and password used on the POS.
2. Give the device a name (e.g. "Bar phone") and grant notification permission when asked. If
   permission was denied earlier, the app links straight to the phone's notification settings
   instead of asking a second time, since a second in-app prompt after a denial does nothing on
   either platform.
3. Tap **Register this device**, then **Send test notification** to confirm sound and vibration
   work before relying on it during service — waiting for a real order to find out is the wrong
   time to discover the phone was muted.
4. Leave the phone plugged in, with Do Not Disturb off and battery optimization disabled for the
   app, on the counter for the rest of the shift.

## If a phone stops receiving orders

- **Check the test notification first.** **Send test notification** on the device-setup screen is
  the fastest way to tell "this phone stopped receiving" from "nobody's paid an order that
  qualifies yet."
- **Confirm the category is tagged correctly.** A drinks category accidentally left at the `None`
  default notifies nobody; check its station on the [Categories](/catalog/categories) list, which
  shows every category's station next to its name.
- **Re-register after a reinstall.** Reinstalling the app or updating the OS can rotate the
  device's push token; registering again from the setup screen replaces the old token under the
  same device rather than creating a second, dead entry.
- **Log out or unregister a phone that's leaving service** — both stop it from receiving further
  orders, which matters for a lost or replaced phone.
- **A push service outage is the fallback case this app was built to survive.** If Expo (or the
  phone's push service) is briefly down, the order is still exactly where it always was: on the
  [Transactions](/sales/transactions) list and the printed order slip.

## Key capabilities

- **Two screens, one job** — login and device setup; no queue, no ticket list, no bump button in
  this app yet.
- **One alert per paid transaction, to every phone** — no per-device station subscription to keep
  correct as staff move between the bar and the kitchen mid-shift.
- **Same station rule as the printed slip** — a category's `Bar`/`Kitchen`/`None` tag
  ([Categories](/catalog/categories)) decides both whether the slip prints a section and whether
  the KDS buzzes, so the two surfaces can never disagree.
- **Loud by design** — an Android notification channel created at maximum importance with sound
  and vibration, built to be heard over a busy room.
- **Send test notification** — confirms a device is set up correctly without waiting for a real
  order.
- **Unregister and log out** — either stops a phone from receiving further orders.

## For engineers

- App: `apps/kds-mobile` — Expo, two screens, its own `@gatherloop-pos/ui/kds` import graph
  alongside `/pos` and `/order` (`docs/trd-ui-presentation-split-by-app.md`)
- Screens and handler: `libs/ui/src/presentation/views/screens/kds/{KdsLoginScreen,KdsDeviceSetupScreen}.tsx`,
  `libs/ui/src/presentation/handlers/kds/KdsDeviceSetupHandler.tsx`
- Device-side push capability, behind an interface so tests never touch `expo-notifications`:
  `libs/ui/src/domain/repositories/pushToken.ts`, implemented in
  `libs/ui/src/data/native/ExpoPushTokenRepository.ts`
- Backend station rule and outbox: `apps/api/domain/kds_notification_routing.go`
  (`ShouldNotify`, `StationLines`), `apps/api/domain/kds_notification_usecase.go`
  (`EnqueueForPaidTransaction`, `DispatchPending`), tables `kds_devices` and `kds_notifications`
  (migrations `000031`/`000032`)
- Delivery gateway: `apps/api/data/expopush/kds_push_repo.go`, calling
  `POST https://exp.host/--/api/v2/push/send`, configured by `EXPO_PUSH_ACCESS_TOKEN`,
  `KDS_PUSH_SOUND`, and `KDS_DISPATCH_INTERVAL_SECONDS` in `apps/api/.env`
- The single trigger point: `payTransaction` (`apps/api/domain/transaction_usecase.go`), called by
  both the POS `PUT /transactions/{id}/pay` route and the order app's QRIS confirmation — one
  insertion point for every way a transaction becomes paid
- Design doc: `docs/prd-kds-order-notifications.md` — why payment (not creation) is the trigger
  (D1), why routing reuses `categories.station` instead of a new taxonomy (D2), why one
  notification goes to every device instead of per-device station subscriptions (D24), and what's
  explicitly deferred to a future KDS project — the order queue, ticket ages, and the bump button
  (D16)
