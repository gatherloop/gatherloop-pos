# PRD: Order App UX — Round 2

Second round of feedback on the customer-facing order app (`apps/order-web`),
after [`docs/prd-table-ordering.md`](./prd-table-ordering.md) shipped the QR flow,
[`docs/prd-order-checkout-qris-doku.md`](./prd-order-checkout-qris-doku.md) shipped
QRIS payment, and [`docs/prd-order-app-ux-improvements.md`](./prd-order-app-ux-improvements.md)
shipped the first round of fixes (floating shell, recipe field, cart line edit,
floor number in the header).

Four issues, all on the guest-facing surface: navigation gives no feedback, the
cart bar still slips below the fold on a phone, checkout asks the guest to commit
twice, and the app does not identify the business it belongs to.

## Problem Statement

### 1. Client-side navigation gives no feedback

`apps/pos-web/src/pages/_app.tsx:27` renders `<NextNProgress options={{ showSpinner: false }} />`
— the POS gets a top progress bar on every route change. `apps/order-web/src/pages/_app.tsx`
renders nothing equivalent.

This matters more in the order app than in the POS, because every order route is
server-rendered per request: `t/[code]/index.tsx`, `t/[code]/cart/index.tsx`,
`t/[code]/checkout.tsx` and `t/[code]/status.tsx` each export
`getServerSideProps`, and each awaits at least one API round trip
(`resolveTableByCode`, and on the checkout page a second `fetchCurrentName` in
the same `Promise.all`). On café Wi-Fi the gap between tapping "Lihat Keranjang"
and the cart painting is entirely silent — the button stays pressed-looking, the
old page stays on screen, and the guest taps again.

`nextjs-progressbar@^0.0.16` is already a dependency in the root `package.json:41`,
so this is a missing three-line wiring, not a new dependency.

### 2. The cart bar is still cut off after scrolling

Round 1 moved the cart bar into a fixed shell: `OrderLayout.tsx:10-16` injects
`.order-shell-height { height: 100vh; height: 100dvh; }`, the shell is
`overflow="hidden"`, the menu scrolls in an inner `ScrollView`, and the footer
(`CartBar`) sits outside it. On a desktop browser this is correct. On a phone the
bar still ends up partly below the fold, and the guest has to drag the page to
reveal it — which is the symptom reported.

**Root cause.** Two different height models disagree, and they only disagree
*sometimes*:

- `apps/order-web/src/pages/global.css` sets `html, body, #__next { height: 100% }`.
  `100%` resolves against the **layout viewport**, which on Chrome for Android is
  the small viewport while the URL bar is shown and grows to the large viewport
  after it collapses.
- `OrderLayout.tsx` sets the shell to `100dvh` — the **dynamic viewport**, which
  tracks the URL bar continuously.

While the URL bar is visible the two agree and the bar is pinned correctly. The
moment the guest scrolls the menu and the URL bar collapses, `100dvh` grows to
the large viewport while `#__next` is still at the old `100%`; the shell now
overflows its parent by roughly the height of the URL bar, and the **document**
— which has no `overflow: hidden` of its own — becomes scrollable by exactly
that much. The footer is pushed below the visible area by that overflow, so it
renders half-visible and has to be scrolled into view. It recovers on its own
once the URL bar comes back, which is why the bug reads as intermittent.

**Second-order symptom, same area.** The cart page's checkout CTA is not in the
layout's footer slot at all. `CartScreen.tsx:141-160` renders it as
`position: "sticky"; bottom: 0` *inside* the scroll area, wrapped in a
`<YStack gap="$4" paddingBottom="$6">` (line 85). A sticky child is bounded by
its containing block's content box, so at the very end of the scroll the CTA
floats `$6` above the scrollport edge instead of sitting flush. Two screens, two
different mechanisms for "the bar at the bottom".
`CheckoutSummaryView.tsx:64-84` repeats the sticky pattern a third time.

### 3. Checkout asks the guest to commit twice

Today, from a filled cart:

1. `CartScreen` shows `Checkout · Rp 45.000` → `CartHandler.tsx:156` pushes
   `/t/{code}/checkout`.
2. The checkout page server-renders, then shows `CheckoutSummaryView` — a second
   recap of the same line items the guest was just looking at — with
   `Bayar dengan QRIS · Rp 45.000`.
3. That opens `CustomerNameSheet` ("Atas nama siapa pesanan ini?").
4. Submitting creates the payment and swaps the same page to `QrisPaymentView`.

Steps 1 and 2 are the same decision expressed twice, with a full server round
trip between them, and the cart recap in step 2 duplicates the cart the guest
just left. The guest experiences it as "I already pressed checkout".

**Root cause.** The checkout *page* exists only to host two things the cart page
could host itself: a summary the cart already renders, and a name sheet. The one
thing that genuinely needs its own place — the QR — is the thing that has no
URL:

- `CheckoutUsecase` holds the payment in memory (`checkout.ts` `Context.payment`).
  Reloading while the QR is on screen resets the machine to `idle`, so the guest
  lands back on the summary with no way to reach the QR they were paying.
- Re-submitting is at least safe — `apps/api/domain/payment_usecase.go:85-99`
  looks up `GetPendingPaymentByCartId` and returns the existing payment when
  `IsAwaitingPayment(time.Now())`, so no duplicate transaction is created — but
  the guest has to walk the name sheet again to see the same QR.
- Meanwhile `/t/{code}/status?ref={reference}` **is** a durable, server-rendered
  URL for a payment (`status.tsx` fetches it in `getServerSideProps`), and
  `fetchPayment` returns the full `Payment` including `qrContent` and `expiredAt`
  (`libs/ui/src/data/api/payment.transformer.ts`). It just refuses to show the QR
  and only renders the post-payment "Pesanan Anda sedang disiapkan" screen
  (`OrderStatusScreen.tsx:52-56`).

So the app has one page too many at the front of checkout and one page too few
behind it — and the second is already built, it is only gated to the paid state.

### 4. The app does not look like it belongs to Gatherloop

`TableResolveScreen.tsx:60-67` renders the entire header as one `XStack`:
`Meja 3 · Lantai 2`. There is no logo, no business name, and
`apps/order-web/src/pages/_app.tsx` sets `<title>Gatherloop Order</title>` —
an internal-sounding name the guest sees in their tab and in browser history.
`apps/order-web/public/` contains only `favicon.ico` and `tamagui.css`.

A guest who scans a QR on a table has no confirmation, anywhere on the screen,
that they are in the café's own ordering app rather than a generic form. This is
the single cheapest trust signal the app is missing.

## How the Industry Handles This

- **Route progress.** A thin top-of-viewport progress bar on client navigation is
  the de-facto Next.js convention (`nprogress` and its wrappers, of which this
  repo already uses one in the POS). It is preferred to a blocking spinner
  because it leaves the current page interactive and readable while the next one
  loads.
- **Viewport units.** `svh`/`lvh`/`dvh` exist precisely because "100% of the
  screen" is ambiguous on mobile. The published guidance is to use the *small*
  viewport (`svh`) for a shell that must never overflow, and to reserve `dvh` for
  elements that can tolerate resizing mid-scroll — mixing a `%`-height ancestor
  with a `dvh` descendant is the classic way to manufacture a few dozen pixels of
  unwanted document scroll.
- **Safe areas.** A bottom-pinned action bar is expected to add
  `env(safe-area-inset-bottom)` padding under `viewport-fit=cover` — which this
  app already does (`OrderLayout.tsx:42`) and should keep.
- **Checkout steps.** Checkout-usability research is consistent that every extra
  step between "I want to pay" and the payment instrument loses conversions, and
  that an order recap shown immediately after the cart is redundant rather than
  reassuring. Food-ordering web apps (GoFood, ShopeeFood, Toast's guest ordering)
  go from cart straight to a payment sheet; the order recap is shown *after*
  payment, on the status screen.
- **Venue identity.** QR-ordering products (Toast, Square, Mr Yum) put the
  venue's logo and name in a persistent top bar, with the table identifier as a
  secondary line — the brand is the constant, the table is the context.

Sources listed at the bottom of this document.

## Alternatives Considered

### A. Fixing the footer

**Option A1 — `svh` shell + a non-scrollable document.** ✅ Two CSS declarations.
✅ Keeps the existing single-scroller architecture, the sticky search bar, and the
`Sheet` overlays exactly as they are. ✅ The document can never gain overflow, so
the failure mode is structurally impossible rather than tuned away. ❌ Costs the
guest the URL-bar-collapse screen gain (~56px on Android), because a page that
never scrolls at the document level never collapses the URL bar.

**Option A2 — document-scrolling page with `position: fixed` bars.** ✅ Matches
how most mobile web storefronts are built. ✅ Recovers the URL-bar screen gain.
❌ Rewrites `OrderLayout`, the inner `ScrollView`, the sticky search header and
every screen's padding assumptions. ❌ `position: fixed` interacts badly with the
Tamagui `Sheet` overlays already used for item detail, cart line edit and the
name sheet. ❌ Large diff in shared layout code for a bug whose cause is two
disagreeing declarations.

**Option A3 — keep `dvh`, add `overflow: hidden` to `html, body`.** ✅ One-line
fix. ❌ Leaves the shell resizing under the guest's finger mid-scroll, which is
the other half of the jitter; `dvh` recalculates during the URL-bar animation.
❌ `overflow: hidden` on `body` alone is unreliable on iOS Safari without a height
clamp.

**Recommended: A1**, plus `overscroll-behavior: none` so a rubber-band drag can't
fake the same symptom. The screen-space cost is real but small, and a bar the
guest can always reach is worth more than 56px of menu.

### B. Removing the double checkout

**Option B1 — cart creates the payment; the existing status page shows the QR.**
The cart CTA becomes `Bayar dengan QRIS · Rp…`, opens the name sheet, creates the
payment, and navigates to `/t/{code}/status?ref={reference}`, which renders the
QR while pending and the prepared-order screen once paid. ✅ Removes a page and a
server round trip from the happy path. ✅ Gives the QR a durable, reloadable,
screenshot-able URL — reloading mid-payment is currently unrecoverable. ✅ Reuses
`QrisPaymentView`, `CustomerNameSheet`, `PaymentSuccessView` and the status
page's existing SSR fetch; nothing new is designed. ✅ Leaves the app with three
guest routes (menu, cart, status) instead of four. ❌ `OrderStatusUsecase` gains
polling and an expiry branch. ❌ The `/checkout` route has to be retired.

**Option B2 — cart creates the payment; keep `/checkout` as a QR-only page.**
✅ Smaller change to `OrderStatusUsecase`. ❌ Keeps a page whose only content is a
QR that the status page could show. ❌ Two pages that both render a payment by
reference, one of which can't be reloaded. ❌ Leaves the post-payment redirect
hop (`CheckoutHandler.tsx:47-56` pushes to `/status` two seconds after paid) in
place, which is a second navigation the guest did not ask for.

**Option B3 — keep both pages, auto-open the name sheet on arrival at
`/checkout`.** ✅ Smallest diff. ❌ Does not fix the complaint: the guest still
taps a button, waits for a page, and then deals with a sheet. ❌ Keeps the
redundant recap.

**Recommended: B1.**

### C. The brand header

**Option C1 — brand bar inside `OrderLayout`'s header slot, on every order
screen.** ✅ One component, one place, every screen branded. ✅ The table line
stays where guests already look for it. ❌ Costs ~24px of vertical space on every
screen including the cart.

**Option C2 — brand bar on the menu screen only.** ✅ No vertical cost elsewhere.
❌ The header would change shape between screens of the same app, which reads as
less official, not more. ❌ `TableResolveScreen` renders the header for all four
screens, so "menu only" means threading a flag through a shared component.

**Recommended: C1.**

## Proposed Solution

### FR-1 — Route-change progress bar (order app)

`apps/order-web/src/pages/_app.tsx` renders `<NextNProgress>` with
`showSpinner: false`, matching the POS. It appears on every client-side
navigation, including the SSR wait, and is the only global navigation affordance
— no full-screen blocking spinner.

### FR-2 — The order shell never lets the document scroll

- `.order-shell-height` becomes `height: 100%` with `height: 100svh` as the
  progressive-enhancement line (replacing `100vh`/`100dvh`).
- `apps/order-web/src/pages/global.css` gains `overflow: hidden` and
  `overscroll-behavior: none` on `html, body`.
- The footer slot is therefore always fully visible, above
  `env(safe-area-inset-bottom)`, with no scrolling required, in every URL-bar
  state.

### FR-3 — One bottom-bar mechanism, not three

Every order screen's primary action renders through `OrderLayout`'s `footer`
slot. The cart's checkout CTA moves out of the scroll area into that slot
(`CartScreen` gains the same `footer` threading `MenuListScreen` already has).
`position: sticky` disappears from `CartScreen`; it disappears from
`CheckoutSummaryView` when that component is deleted in Phase 5. The sticky
*search* header on the menu screen is unaffected — it is a header, not a footer,
and it works.

### FR-4 — The status page becomes the payment page

`/t/{code}/status?ref={reference}` renders, from the payment's `status`:

| `payment.status` | Screen |
| --- | --- |
| `pending` | `QrisPaymentView` — QR, amount, countdown to `expiredAt`, reference |
| `paid` | today's prepared-order screen (`tableLabel`, customer name, items) |
| `expired` / `failed` | "Waktu pembayaran habis" + "Kembali ke keranjang" |

While `pending`, the page polls `fetchPayment(reference)` on the interval
`CheckoutUsecase` uses today (3s), and transitions in place to the paid screen —
no navigation, no two-second redirect timer. Polling stops on any terminal state
and on unmount. A reload at any point re-renders the correct state from
`getServerSideProps`, because the reference is in the URL.

### FR-5 — Checkout happens on the cart page

With a non-empty cart and checkout enabled, the cart footer CTA reads
`Bayar dengan QRIS · Rp {total}` — the label the guest sees today only after the
extra hop. Pressing it opens `CustomerNameSheet` over the cart, pre-filled with
the customer's last known name. Submitting:

1. validates the name (unchanged: non-empty, ≤60 chars),
2. creates the payment,
3. navigates to `/t/{code}/status?ref={reference}`.

Failures keep the guest on the cart with an inline error and a retry, exactly as
`CheckoutScreen`'s `error` variant does today. The cart is not cleared by the
frontend; that stays the API's business.

### FR-6 — `/t/{code}/checkout` is retired

The route becomes a permanent redirect to `/t/{code}/cart`, so a guest with the
page still open in a background tab (or a bookmark from a prior session) lands
somewhere useful rather than on a 404. `CheckoutScreen`, `CheckoutHandler`,
`app/order/Checkout.tsx` and `CheckoutSummaryView` are deleted.

### FR-7 — The checkout feature flag is deleted

`NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` and everything it gates are removed, not
moved: the `enabled` prop on `CheckoutHandler`, `CheckoutScreen`'s `disabled`
variant and its "Checkout belum tersedia" copy, the read in
`app/order/Checkout.tsx:39`, the entry in `apps/order-web/.env.example:23`, the
override in `apps/order-web-e2e/playwright.config.ts:30`, and the already-dead
`checkout.disabledTitle` selector (`apps/order-web-e2e/src/utils/selectors.ts:83`,
referenced by no spec). The cart's CTA is unconditional whenever the cart is
non-empty.

### FR-8 — Brand header

`OrderLayout`'s header slot renders, on every order screen:

```
┌────────────────────────────────────────────┐
│ ▢  Gatherloop Board Game Cafe              │
│    Meja 3 · Lantai 2                       │
└────────────────────────────────────────────┘
```

- Logo: 36×36, `borderRadius="$3"`, from `/brand/logo.png` — a committed
  placeholder rectangle until the real asset lands (see D10).
- Business name: `fontWeight="bold"`, one line, `numberOfLines={1}`.
- Table line: today's `{label} · Lantai {n}`, muted, unchanged in content.
- The bar sits on `$color2` as it does now, with a hairline bottom border, and
  does not scroll away (it is outside the `ScrollView` already).
- On the non-resolved table variants (`resolving`, `noQr`, `invalidQr`, `error`)
  the brand row renders without the table line, so the app is branded even
  before a table resolves.
- `apps/order-web`'s document title becomes `Gatherloop Board Game Cafe`, with a
  `meta description` and a `theme-color` matching the header background.

## Design decisions

**D1 — `svh`, not `dvh`, for the order shell.** The shell's job is to be a box
that never overflows its parent. `svh` is the only unit that guarantees that
against a `%`-height ancestor in every URL-bar state; `dvh` guarantees it in
none. *Alternative rejected:* keeping `dvh` and making `#__next` `dvh` too — it
removes the mismatch but keeps a shell that resizes mid-scroll, and every
descendant percentage height inherits that jitter.

**D2 — `overflow: hidden` on `html, body` as a belt-and-braces, not as the
fix.** With D1 the document has nothing to scroll; the declaration exists so that
a future stray `margin`/`min-height` in a child cannot reintroduce the bug
silently. `overscroll-behavior: none` is added in the same rule to kill
rubber-banding, which looks identical to the reported symptom.

**D3 — The bottom bar is a layout slot, never `position: sticky`.**
`OrderLayout`'s `footer` is outside the `ScrollView`, so it cannot be affected by
scroll position, containing-block padding, or sticky-support quirks. Every
screen's primary CTA goes through it. *Alternative rejected:* fixing the
`paddingBottom="$6"` containing-block gap in `CartScreen` — it makes the symptom
smaller while leaving two mechanisms in the codebase for the same thing.

**D4 — The payment QR lives at a URL, keyed by reference.** A payment is server
state with a reference the API already returns; the app should address it, not
hold it in a component's memory. This is what makes reload, back-navigation and
"screenshot it and pay later" work, and it is the property the current checkout
page lacks. *Alternative rejected:* keeping the QR in `CheckoutUsecase` and
persisting the reference in the session cookie — it re-implements the URL
badly, and `/status?ref=` already exists.

**D5 — The QR page is the status page, not a new route.** Both render one
`Payment` fetched by reference in `getServerSideProps`; splitting them means two
routes, two composition roots and two SSR fetches for one resource whose only
difference is `status`. *Alternative rejected:* B2 above.

**D6 — `OrderStatusUsecase` absorbs polling; `CheckoutUsecase` loses it.**
After this change `CheckoutUsecase` is a create-a-payment machine
(`idle → askingName → creatingPayment → created`), and everything about watching
a payment (`POLL`, `POLL_SUCCESS`, `POLL_ERROR`, `COUNTDOWN_ELAPSED`, `EXPIRE`,
the `setInterval` in `onStateChange`) belongs to `OrderStatusUsecase`, keyed off
its SSR-seeded `payment`. Neither machine ends up owning both halves of the flow.
The trim happens in its own phase (Phase 6) so the behavioural PR and the
dead-code PR review separately.

**D7 — `created` is a terminal state; the handler navigates.** `CheckoutUsecase`
stops at `created` with the payment in context; `CartHandler` reacts to that
state with `router.push`. Navigation stays in the handler, per
[`docs/handlers.md`](./handlers.md) — the use case never touches the router.

**D8 — The cart page pre-fetches the customer name.** The `fetchCurrentName`
call currently in `checkout.tsx`'s `getServerSideProps` moves into the cart
page's, alongside the table resolve and in the same `Promise.all`, so the name
sheet opens pre-filled with no client fetch and no flash of an empty input.
*Alternative rejected:* fetching the name lazily when the sheet opens — it adds
a spinner to a sheet that should open instantly, on the one interaction that is
already a commitment.

**D9 — `/t/{code}/checkout` redirects rather than 404s.** Implemented as a
`redirects()` entry in `apps/order-web/next.config.js` (permanent), not as a page
that renders and then redirects — no bundle, no flash. Table QR codes point at
`/t/{code}`, never at `/checkout`, so nothing printed is invalidated.

**D10 — The logo is a committed placeholder asset, not inline markup.**
`apps/order-web/public/brand/logo.png` is a neutral rectangle; replacing it with
the real logo is a file swap with no code change and no review of layout code.
The component takes a `logoUri` prop defaulting to `/brand/logo.png` so Storybook
can pass an inline data URI instead of 404-ing against a Next.js public path.
*Alternative rejected:* an inline SVG or a CSS-only rectangle — both mean the
real logo lands as a code change in `libs/ui`, and `next/image` is banned in
`libs/ui` outside `utils/` anyway
([`docs/trd-order-app-composition-and-ssr.md`](./trd-order-app-composition-and-ssr.md)).

**D11 — The business name is a constant in `libs/ui`, not a prop or an API
field.** `libs/ui/src/utils/brand.ts` exports
`ORDER_BRAND_NAME = 'Gatherloop Board Game Cafe'` and `ORDER_BRAND_LOGO_URI`.
One venue, one brand; a settings-backed name is a real feature with a migration
and a POS form, and nothing in this round needs it. Recorded as Open Question 2
rather than pre-built.

**D12 — The brand bar renders on every order screen, including the pre-resolve
states.** A guest whose QR fails to resolve is exactly the guest who most needs
to see whose app they are in. `TableResolveScreen`'s five variants all get the
header; only the table line is conditional.

**D13 — The checkout kill switch is deleted, not relocated.** `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`
existed to keep a half-built checkout unreachable while
[`docs/prd-order-checkout-qris-doku.md`](./prd-order-checkout-qris-doku.md)
landed across thirteen phases (its **D20**). That job is done: checkout has
shipped, the flag is `true` in production, and the only thing it can still do is
hide the cart's one action behind an env var nobody intends to flip. Keeping it
would mean carrying the disabled copy, a second CTA state, a story and a test
through every future change to the cart footer. **This supersedes D20 of
`prd-order-checkout-qris-doku.md`.**

*Alternative rejected:* moving the flag to the cart composition root (the
original FR-7). It preserves a kill switch nobody has used since launch, at the
cost of a permanent branch in the screen that most of this PRD is rewriting.

*Consequence, stated plainly:* disabling guest checkout in an incident becomes a
revert-and-deploy rather than an env flip. That is the honest trade — and the
env-var switch was never a clean one anyway, since it left the guest on a cart
whose only button says "not available" with no explanation and no alternative
path. If a real kill switch is wanted later it belongs on the API
(`POST /carts/current/checkout` returning a typed "ordering is closed" error the
app can render), where it can also stop a payment already in flight. Out of
scope here.

## Phased plan

Each phase is one PR, leaves `main` green and the order app shippable, and names
its own acceptance check.

| # | Phase | Depends on |
| --- | --- | --- |
| 1 | Route-change progress bar | — |
| 2 | Shell height fix + footer slot for the cart CTA | — |
| 3 | Brand header | — |
| 4 | Status page renders pending payments (QR + polling) | — |
| 5 | Checkout from the cart; `/checkout` retired | 4 |
| 6 | `CheckoutUsecase` trim + dead-code removal | 5 |
| 7 | Docs-site update (optional) | 3, 5 |

Phases 1–4 are independent of each other and can land in any order or in
parallel.

---

### Phase 1 — Route-change progress bar

**Goal:** FR-1.

- `apps/order-web/src/pages/_app.tsx`: render
  `<NextNProgress color={ORDER_BRAND_COLOR} height={3} options={{ showSpinner: false }} />`
  above `RootProvider`, mirroring `apps/pos-web/src/pages/_app.tsx:27`. The
  colour constant lives in the page file until Phase 3 introduces
  `libs/ui/src/utils/brand.ts`, at which point it moves there.
- No new dependency: `nextjs-progressbar` is already in the root `package.json`.

**Acceptance**
- Tapping "Lihat Keranjang" on a throttled connection shows the bar within
  ~200ms and completes when the cart paints.
- The bar appears for cart → status and menu → cart alike.
- No spinner in the corner.
- A full page reload shows no bar (nprogress is a client-router affordance only).

**Estimated diff:** ~10 LoC.

---

### Phase 2 — Shell height fix and one bottom-bar mechanism

**Goal:** FR-2, FR-3.

- `libs/ui/src/presentation/views/components/base/OrderLayout.tsx`:
  `.order-shell-height` becomes `height: 100%; height: 100svh;`. Keep
  `overflow="hidden"` and the `env(safe-area-inset-bottom, 13px)` footer padding.
- `apps/order-web/src/pages/global.css`: add `overflow: hidden;` and
  `overscroll-behavior: none;` to the existing `html, body, #__next` rule.
- `libs/ui/src/presentation/views/screens/order/CartScreen.tsx`: delete the
  sticky wrapper (lines 141-160); pass the checkout `Button` to
  `TableResolveScreen`'s `footer` prop, as `MenuListScreen` already does at
  `MenuListScreen.tsx:61`. Drop the now-unneeded `paddingBottom="$6"` from the
  loaded branch.
- `CartScreen.stories.tsx`: a story with enough line items to scroll, proving the
  footer stays put.
- `CartHandler.test.tsx`: assert the checkout button renders for a loaded cart
  (it moves in the tree; the accessible role must not).

**Acceptance**
- On Chrome for Android, scrolling the menu until the URL bar collapses leaves
  the cart bar fully visible; the document itself never scrolls.
- On iOS Safari with `viewport-fit=cover`, the bar clears the home indicator.
- The cart's checkout button sits flush at the bottom with a long cart, and the
  cart list scrolls behind it.
- The menu's sticky search bar and category chips still stick.
- `MenuItemDetailScreen`, `CartItemEditScreen` and the confirmation alert still
  open and scroll.

**Estimated diff:** ~60–90 LoC.

---

### Phase 3 — Brand header

**Goal:** FR-8.

- New `libs/ui/src/utils/brand.ts`: `ORDER_BRAND_NAME`, `ORDER_BRAND_LOGO_URI`,
  `ORDER_BRAND_COLOR`. Exported from `libs/ui/src/utils/index.ts`.
- New `libs/ui/src/presentation/views/components/base/OrderBrandHeader.tsx`:
  props `{ logoUri?: string; tableLine?: string }`; renders the logo, the
  business name and the optional muted table line. Exported from the folder
  barrel.
- New `OrderBrandHeader.stories.tsx`: with and without the table line, with a
  long table label, and with a data-URI logo.
- `TableResolveScreen.tsx`: all five variants render `OrderLayout` with
  `header={<OrderBrandHeader … />}`; the `resolved` variant passes
  `` tableLine={`${table.label} · Lantai ${table.floorNumber}`} ``.
- `TableResolveScreen.stories.tsx`: refresh the existing stories for the new
  header.
- New `apps/order-web/public/brand/logo.png`: neutral placeholder rectangle
  (144×144, so it stays crisp at 36pt @4x).
- `apps/order-web/src/pages/_app.tsx`: `<title>` → `Gatherloop Board Game Cafe`,
  add `meta description`; move the Phase 1 colour constant to `brand.ts`.
- `apps/order-web/src/pages/_document.tsx`: set the existing `theme-color` meta's
  content to the header background.
- `MenuListHandler.test.tsx` (or `CartHandler.test.tsx`): assert the business
  name is on screen.

**Acceptance**
- Every order screen — menu, cart, status, and the invalid-QR/error states —
  shows the logo and "Gatherloop Board Game Cafe".
- The table line still reads `Meja 3 · Lantai 2` on a resolved table and is
  absent before one resolves.
- A long table label wraps or truncates without pushing the brand row around.
- The browser tab reads "Gatherloop Board Game Cafe".
- Storybook renders `OrderBrandHeader` without a network 404.

**Estimated diff:** ~140–180 LoC plus one binary asset.

---

### Phase 4 — The status page renders pending payments

**Goal:** FR-4. Ships behind no flag and breaks nothing: today `/status?ref=` is
only ever reached with a paid payment, so the new branches are unreachable until
Phase 5 — but they are testable, storybook-able and e2e-able on their own.

- `libs/ui/src/domain/usecases/orderStatus.ts`: add the polling half — states
  `awaitingPayment` / `expired`, actions `POLL`, `POLL_SUCCESS`, `POLL_ERROR`,
  `COUNTDOWN_ELAPSED`, `EXPIRE`; the `setInterval` and the `fetchPayment` call
  move in from `checkout.ts` `onStateChange` unchanged (3s, cleared on every
  non-awaiting state). `getInitialState` routes an SSR-seeded payment by
  `status`: `pending` → `awaitingPayment`, `paid` → `loaded`,
  `expired`/`failed` → `expired`.
- `orderStatus.test.ts`: pending-seeded → polls → paid; pending → expired;
  poll error keeps the QR on screen; the interval is cleared on a terminal state.
- `libs/ui/src/presentation/views/screens/order/OrderStatusScreen.tsx`: new
  `awaitingPayment` variant rendering `QrisPaymentView` (moved untouched from
  `CheckoutScreen`'s usage) and a new `expired` variant with
  "Kembali ke keranjang".
- `OrderStatusScreen.stories.tsx`: pending, paid, expired.
- `OrderStatusHandler.tsx` / `.test.tsx`: map the new states; assert the QR
  renders for a pending payment and that it flips to the prepared-order screen
  when the polled payment turns paid.
- `apps/order-web/src/pages/t/[code]/status.tsx`: unchanged — it already passes
  the SSR payment through.

**Acceptance**
- Visiting `/t/{code}/status?ref={pending reference}` shows the QR, the amount
  and a live countdown.
- Marking the payment paid flips the page to the prepared-order screen without a
  navigation.
- An expired payment shows the expiry screen with a route back to the cart.
- Reloading at any of the three states renders the same state.
- A paid payment still renders exactly as it does today.

**Estimated diff:** ~220–280 LoC.

---

### Phase 5 — Checkout from the cart page

**Goal:** FR-5, FR-6, FR-7.

**Frontend**
- `libs/ui/src/presentation/handlers/order/CartHandler.tsx`: takes
  `checkoutUsecase`; owns `useCheckout`; the footer CTA dispatches `ASK_NAME`;
  renders `CustomerNameSheet` from the `askingName` state; a `useEffect` on the
  `created` state pushes `/t/{tableCode}/status?ref={reference}` (D7).
- `libs/ui/src/presentation/views/screens/order/CartScreen.tsx`: CTA label
  becomes `Bayar dengan QRIS · {total}`; new props for the name sheet
  (`nameSheet: CustomerNameSheetProps | null`) and the checkout error message.
  No enabled/disabled branch (D13).
- `libs/ui/src/app/order/Cart.tsx`: news up `ApiPaymentRepository` and
  `CheckoutUsecase`, accepts `customerName`. Reads no env var.
- `apps/order-web/src/pages/t/[code]/cart/index.tsx`: `getServerSideProps` adds
  `fetchCurrentName()` to its `Promise.all` (D8).
- Delete `CheckoutScreen.tsx`, `CheckoutScreen.stories.tsx`,
  `CheckoutHandler.tsx`, `CheckoutHandler.test.tsx`, `app/order/Checkout.tsx`,
  `CheckoutSummaryView.tsx`, `CheckoutSummaryView.stories.tsx`,
  `apps/order-web/src/pages/t/[code]/checkout.tsx`, and their barrel exports.
- `apps/order-web/next.config.js`: permanent redirect
  `/t/:code/checkout` → `/t/:code/cart` (D9).
- Flag removal (D13): drop `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` from
  `apps/order-web/.env.example` (the variable and its four comment lines) and
  from `apps/order-web-e2e/playwright.config.ts`'s `webServer.env`. Nothing in
  `apps/api`, `vercel.json` or the deploy workflows reads it. The variable may
  stay set on the running hosts; it becomes inert, and removing it there is a
  deploy-time cleanup, not a code change.
- `CartScreen.stories.tsx`: idle CTA, name-sheet-open, creating-payment,
  checkout-error.
- `CartHandler.test.tsx`: pressing the CTA opens the sheet pre-filled; submitting
  an empty name shows the validation error and creates nothing; a valid submit
  calls `MockPaymentRepository.checkout` and navigates with the returned
  reference; `setShouldFail(true)` keeps the guest on the cart with a retry.

**e2e** (`apps/order-web-e2e`)
- `src/utils/selectors.ts`: `cartScreen.checkoutButton` matches
  `/^Bayar dengan QRIS/`; the name-sheet and QR selectors move from the
  `checkout` group to `cartScreen`/`orderStatus`; drop `checkout.summaryTitle`
  and `checkout.disabledTitle` (already referenced by no spec).
- `src/checkout.spec.ts`: after opening the cart, assert the CTA, fill the name,
  wait for `POST /carts/current/checkout`, assert the URL is
  `/t/{code}/status?ref={reference}` and the QR is visible, `markPaid`, assert
  the prepared-order screen **without** a second navigation, then reload and
  re-assert. Add a case that reloads while the QR is on screen.

**Acceptance**
- Cart → name sheet → QR, with exactly one navigation and no order recap in
  between.
- The name sheet opens pre-filled with the guest's previous name.
- Cancelling the sheet leaves the cart untouched.
- A payment failure keeps the guest on the cart with a retry; retrying succeeds.
- Paying reaches the prepared-order screen in place, on the same URL.
- `/t/{code}/checkout` redirects to the cart.
- `grep -rn ORDER_CHECKOUT_ENABLED` returns only `docs/` history — no source, no
  config, no e2e.
- The e2e suite passes with no `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` in
  `playwright.config.ts`.

**Estimated diff:** ~350–450 LoC, about a third of it deletions.

**Note:** the Playwright suites run post-merge only
(`.github/workflows/e2e-main.yml`), so `npx nx run order-web-e2e:e2e` must be run
locally on this phase.

---

### Phase 6 — Trim `CheckoutUsecase`

**Goal:** D6's second half. Pure dead-code removal, no behaviour change.

- `libs/ui/src/domain/usecases/checkout.ts`: drop `awaitingPayment`, `paid`,
  `expired` states, the `POLL*` / `COUNTDOWN_ELAPSED` / `EXPIRE` actions, the
  `isPolling` context field and the `pollTimerId` interval; `CHECKOUT_SUCCESS`
  lands in a terminal `created` state carrying the payment. Keep the `error`
  state and its `SUBMIT_NAME` retry edge.
- `checkout.test.ts`: delete the polling cases; add `created` as terminal.
- `libs/ui/src/data/mock/payment.ts`: drop fixtures only the deleted branches
  used.
- Grep for `useCheckout` consumers — `CartHandler` should be the only one.

**Acceptance**
- `npx nx run ui:test` green; no reference to `awaitingPayment` remains in
  `checkout.ts`.
- The cart flow behaves identically before and after.

**Estimated diff:** ~120 LoC, almost all deletions.

---

### Phase 7 (optional) — Docs-site

**Goal:** keep `docs-site/` truthful.

- `docs-site/sales/table-ordering.md`: the guest now pays from the cart; the
  order status URL is also the QR URL and can be reloaded; the app header shows
  the venue name.
- Screenshots, if the page carries any, reshot with the brand header.

**Estimated diff:** ~40–60 LoC of prose.

---

## Risks

- **`svh` support.** Safari 15.4+, Chrome 108+, Firefox 101+. The `height: 100%`
  declaration ahead of it is the fallback for anything older, which degrades to
  today's behaviour rather than to something worse.
- **Losing URL-bar collapse costs menu height.** Mitigated by the header being
  compact (one 56px bar) and by the menu's search/chips block already being
  sticky rather than duplicated.
- **`overflow: hidden` on `body` and iOS Safari.** Historically flaky when
  combined with focused inputs — the name sheet and the search field both focus
  inputs. Phase 2's acceptance list includes opening the keyboard on both; if it
  misbehaves, the fallback is D1 alone (drop the `overflow` line, keep `svh`),
  which is sufficient on its own.
- **Polling moves to a page guests keep open.** The status page now polls every
  3s while pending, where the checkout page used to. Same interval, same
  endpoint, same expiry window — but a guest who leaves the QR open in a
  background tab polls until expiry. Acceptable at café scale; a
  `document.visibilityState` pause is the follow-up if it shows up in API logs.
- **A guest who backs out of the QR page has no way back to it.** The cart still
  holds the items and pressing pay again returns the *same* pending payment
  (`payment_usecase.go:85-99`), so they can recover — but the path is not
  signposted. See Open Question 1.
- **No env-var kill switch after Phase 5 (D13).** Turning guest checkout off in
  an incident becomes a revert of the Phase 5 PR and a redeploy, rather than
  flipping `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` and restarting. The window that
  matters is minutes, not seconds — the guest-facing failure mode is a payment
  that can't be created, which already surfaces as the cart's error-and-retry
  state. An API-side switch is the better version of this and is named in D13 as
  out of scope.
- **The e2e suite runs post-merge.** Phase 5 rewrites most of `checkout.spec.ts`;
  it has to be run locally before merge or the break is found on `main`.

## Out of scope

- The real Gatherloop logo and any brand colour system beyond a single header
  colour.
- PWA install, manifest, offline, or an app-like splash screen.
- Any change to the payment API, the QRIS provider integration, or the
  transaction records behind it.
- Multi-language copy; the order app stays Indonesian.
- Split bills, tips, promo codes, or paying for someone else's table.

## Open Questions

1. **Should the cart surface an in-flight payment?** When a pending payment
   exists for the cart, the ideal cart footer reads "Lanjutkan pembayaran" and
   links straight to `/status?ref=`. The cart payload does not carry a pending
   payment reference today, so this needs a contract field
   (`Cart.pendingPaymentReference`) — deliberately deferred out of this round.
2. **Should the business name and logo be operator-configurable?** D11 hard-codes
   them. A settings-backed venue profile is a separate PRD if a second venue ever
   appears.
3. **Exact brand colour.** `ORDER_BRAND_COLOR` needs a hex before Phase 1 merges;
   until then the progress bar can use the CTA blue the buttons already use.

## Success Criteria

- A guest can go from a filled cart to a QR in one tap plus a name, with one page
  transition.
- Reloading the QR page never loses the QR.
- The cart bar is reachable without scrolling, in every URL-bar state, on Android
  Chrome and iOS Safari.
- Every navigation in the app is visibly acknowledged within ~200ms.
- Every screen of the app names the business.

## Sources

- MDN — [CSS viewport units (`svh`, `lvh`, `dvh`)](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths)
- web.dev — [The large, small, and dynamic viewport units](https://web.dev/blog/viewport-units)
- MDN — [`env()` and the safe-area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- Baymard Institute — checkout usability research on step count and redundant
  order-review steps
- `nextjs-progressbar` / `nprogress` — the Next.js route-change progress
  convention, already in use in `apps/pos-web`
