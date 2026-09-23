# Guest WhatsApp Notifications

## What it does

At checkout, the [order app](/sales/order-checkout) asks a guest for their name and a WhatsApp
number, right next to each other in the same sheet. The moment a staff member marks the order
**Ready** in the POS, the guest gets a real WhatsApp message from the venue's own number:

```
Pesanan #12 sudah siap diambil di Meja 4!

1x Coffee Latte - Hot - Vanilla
1x Croissant

Cek status pesanan: https://order.example.com/orders/ORD-…?k=…
```

Tapping the link opens the order's status page — the same green "ready" screen the guest would
have seen if they'd kept the tab open — in **any** browser, on any phone, without a login, a
session cookie, or the order app still being installed or open anywhere.

## Why it matters

The guest's status page only helps a guest who's still looking at it. A guest who locks their
phone, switches apps, or wanders off to browse the venue no longer sees the page flip to "ready" —
and asking every guest to babysit a browser tab isn't realistic. A WhatsApp message reaches a guest
wherever they are, the same way a text from a friend would, with no install step and no browser
permission prompt to accept. It replaces an earlier push-notification opt-in that required an
Android or an iPhone added to the Home Screen to work at all — a WhatsApp number works from any
phone that can receive WhatsApp, which in practice is nearly every guest's phone already.

## The message

- **One message, sent once, ever, per order.** A guest is notified exactly when their order goes
  from preparing to ready — never again for the same order, whatever staff subsequently do to it.
- **The item list, not just "your order."** Every line item appears as `{amount}x {Product} -
  {Option} - {Option}`, the same shape the printed ticket uses, so the message alone tells the
  guest what's waiting for them. A note on an item shows as an italic line underneath it.
- **The link works without the guest's phone remembering anything.** It carries a random access
  key baked into the URL, so it opens the right order's status page on a brand new device, a
  different browser, or a guest who cleared their cookies — anyone holding the link can open it,
  the same way a shared Google Docs link works.

## Un-marking and re-marking an order does not resend

Staff sometimes tap **Ready** by mistake and switch it back with **Undo**. Re-marking the same
order ready does **not** send a second message — the guest was already told once, and a duplicate
"your order is ready" a minute after the first would be confusing, not helpful. This is
deliberate, not a bug: a guest who never got the first message because the gateway was down (see
below) also doesn't get a second attempt just by staff toggling the status.

## If a guest says they got nothing

1. **Check the order's message record.** Every order that reaches **Ready** gets exactly one row
   the API keeps as its send record. Ask an engineer to look it up by the order's transaction —
   its `status` says what happened:
   - `sent` — Fonnte (the WhatsApp gateway) accepted it. The message left the venue's device; from
     here it's the same as a text message not arriving, which is rare but not impossible.
   - `pending` / `sending` — still working through it; give it a few seconds and check again.
   - `failed` — Fonnte rejected it outright (an invalid number, the linked phone offline, quota
     exhausted) after retrying, or the outcome was ambiguous and was never retried by design (a
     lost message is preferred over a guest getting the same "ready" text twice).
   - `skipped` — the gateway isn't configured on this environment at all (this is the normal state
     for local dev and CI; see below).
2. **Check Fonnte's own dashboard.** Fonnte drives a real WhatsApp account through a phone linked
   to the venue's account. If that phone is off, out of battery, or has lost its WhatsApp session,
   every send fails until someone relinks it — Fonnte's dashboard shows the device's connection
   status directly.
3. **The order must have actually been marked ready.** The message is a side effect of the same
   **Ready** action described in [Order Fulfilment Status](/sales/order-checkout) — if the
   transaction hasn't been completed yet, nothing was ever supposed to send.
4. **A guest who never typed a number at checkout gets nothing to notify.** The WhatsApp field is
   required by the checkout form, but a customer's number carries over from browser to browser
   only via cookies — a guest ordering from a friend's phone for the first time starts with an
   empty field.
5. **The status page is always the fallback of record.** A guest who never gets the message, or
   whose phone drops it, can still reload the order page (or find it again from
   [order history](/sales/order-history)) and see "ready" the same as anyone else — the message is
   a convenience, not the only way the guest finds out.

## Watching the quota

Fonnte's plans are metered — every accepted send counts against a monthly quota, and once it runs
out every subsequent send fails the same way a disconnected phone would (`failed`, after retries).
There's no in-POS quota dashboard yet: each accepted send logs Fonnte's own reported remaining
quota to the API's own log output, so a slow drift toward zero shows up there before it becomes a
guest complaint. Treat a sudden wave of `failed` rows as a signal to check Fonnte's dashboard for
quota or device-connection problems, in that order.

## Key capabilities

- **No install, no browser permission, no account.** The guest only ever types their own number,
  once, at checkout.
- **Works on every phone that can receive WhatsApp** — unlike the push notification it replaced,
  there's no OS- or browser-specific setup step for the guest.
- **Remembered for next time.** A returning guest on the same browser sees their name and number
  prefilled at checkout, the same way their name already was.
- **The link opens anywhere, not just the device that ordered.** A guest can forward the WhatsApp
  message itself to a friend picking up on their behalf, and the link still works.
- **One message per order, only when it's actually ready** — never a promotional or reminder
  message, and never sent twice.
- **Fails safe, never loud.** A misconfigured or exhausted gateway never blocks checkout or the
  POS's **Ready** action — it just means no message goes out, and the status page is still there.

## For engineers

- Guest-facing input: `libs/ui/src/presentation/views/components/checkout/CustomerDetailsSheet.tsx`,
  wired through `libs/ui/src/domain/usecases/checkout.ts` and
  `libs/ui/src/presentation/handlers/order/CartHandler.tsx`
- Number normalization and prefill formatting (frontend):
  `libs/ui/src/domain/entities/Customer.ts`; the server-fetched prefill is read in
  `apps/order-web/src/pages/t/[code]/cart/index.tsx` via
  `libs/ui/src/data/api/customer.ts`
- Number normalization (backend, the source of truth): `apps/api/domain/whatsapp_number.go`
- Backend trigger: `TransactionUsecase.CompleteTransaction`
  (`apps/api/domain/transaction_usecase.go`) — the same **Mark as ready** action described in
  [Order Fulfilment Status](/sales/order-checkout); `UncompleteTransaction` deliberately leaves the
  outbox row untouched, which is why re-marking never resends
- Message rule: `apps/api/domain/guest_whatsapp_message.go`; the order link:
  `apps/api/domain/order_link.go`
- Backend outbox and dispatcher: `apps/api/domain/guest_notification_{entity,repository,usecase}.go`,
  table `guest_notifications` (migrations `000034`, `000038`, `000039`), driven by the same
  sweeper that already drives the KDS outbox (`runMaintenanceSweeper`, `apps/api/main.go`)
- Delivery gateway: `apps/api/data/fonnte/fonnte_repo.go`, configured with `FONNTE_TOKEN` /
  `FONNTE_BASE_URL` / `ORDER_WEB_BASE_URL` in `apps/api/.env` — leaving `FONNTE_TOKEN` or
  `ORDER_WEB_BASE_URL` empty boots a disabled gateway that records every notification `skipped`
  (the normal state in local dev, CI and the e2e stack). `go run ./cmd/fonntecheck -to 0812…` from
  `apps/api` sends one real test message and prints Fonnte's raw response.
- Design doc: `docs/prd-order-whatsapp-notifications.md` — why the number is normalized on the
  server rather than trusted from the browser (D2), why re-marking an order never resends (D6),
  why an ambiguous send is never retried (D9), and why an unconfigured gateway records `skipped`
  instead of failing anything (D10)
