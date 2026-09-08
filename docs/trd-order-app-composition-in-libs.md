# TRD — Move the order app's composition into `libs/ui/src/app/order`

**Status:** proposed
**Scope:** `apps/order-web/src/**`, `libs/ui/src/app/order/**`, `libs/ui/src/index.order.ts`, `libs/ui/src/__mocks__/next/router.ts`, `libs/ui/.eslintrc.json`, `apps/order-web/.eslintrc.json`, `docs-site/under-the-hood/clean-architecture.md`
**Non-scope:** `apps/pos-web`, `apps/pos-mobile`, `apps/api`, `libs/ui/src/{domain,data,presentation}`, `libs/provider`, the customer-facing UI itself — no screen, copy, layout, route or interaction changes
**Date of research:** 2026-09-08 (every claim below was checked against the code at `b5696b3`)

---

## 1. Problem statement

`apps/pos-web` has no `src/components/`. A POS page file is a framework adapter and nothing else:
a `getServerSideProps` that reads the request and instantiates repositories, then
`export default <CompositionRoot>` — where the composition root comes from
`@gatherloop-pos/ui/pos` and owns the whole vertical slice (repositories → usecases → handler →
screen). `apps/pos-web/src/pages/categories/create.tsx` is twelve lines, eleven of which are the
auth redirect.

`apps/order-web` does not follow that shape. It carries a `src/components/` folder with three
layout components (`TableLayout`, `MenuLayout`, `CartLayout`, 99 lines) that compose library
screens, read route params, and encode the D4/D5.2 mount-preservation rules from
`docs/trd-order-app-nextjs-migration.md`. Its page files parse route params by hand
(`typeof router.query.productId === 'string' ? Number(...) : NaN`, three times), declare a local
`NextPage & { getLayout }` type five times, and wire `getLayout` per page. `_app.tsx` owns the
order-specific provider stack (`SessionProvider` → `CartProvider`) plus the D5.1 mount gate.

That costs three things:

1. **The architecture is inconsistent between the two frontends.** `docs-site/under-the-hood/clean-architecture.md`
   states that app composition lives in `libs/ui/src/app`. For the order app that is true of the
   inner roots (`MenuList`, `Cart`, …) but not of the layer that composes them, which sits in the
   app.
2. **None of it is testable or storyable.** `libs/ui` has jest and Storybook; `apps/order-web` has
   neither (no `jest.config.ts`, no `tsconfig.spec.json`). `TableLayout`'s `router.isReady` gate —
   a real behaviour with a real failure mode (a "scan the QR" flash before the code arrives, D5.2)
   — has no test anywhere, and cannot get one where it currently lives.
3. **Nothing stops it growing.** `libs/ui/.eslintrc.json` already guards the POS/order boundary
   inside the library, but no rule says an order page must stay a re-export. The next screen that
   needs "a bit of glue" gets a fourth file in `src/components/`.

**This TRD proposes moving every remaining composition decision out of `apps/order-web` and into
`libs/ui/src/app/order`,** so an order page file becomes the same two lines a POS page file is,
and adding the lint rule that keeps it that way.

**This document implements nothing.** It records what moves where, what must not change, and a
phase plan where each phase is one small, reviewable, independently revertable PR that leaves the
live app working.

---

## 2. Current state audit

### 2.1 Everything in `apps/order-web/src` today

| File | Lines | What it does | Fate |
|---|---|---|---|
| `components/TableLayout.tsx` | 42 | `useRouter().isReady` gate → `LoadingView`; reads `code`; renders `TableResolve` | → `libs/ui/src/app/order/TableLayout.tsx` (P1) |
| `components/MenuLayout.tsx` | 30 | reads `code`; renders `TableLayout` → `MenuList` + `children` | → `libs/ui/src/app/order/MenuLayout.tsx` (P2) |
| `components/CartLayout.tsx` | 27 | reads `code`; renders `TableLayout hideCartBar` → `Cart` + `children` | → `libs/ui/src/app/order/CartLayout.tsx` (P3) |
| `pages/_app.tsx` | 65 | `<Head>`, CSS, `RootProvider`, **mount gate**, `SessionProvider`, `CartProvider`, `getLayout` dispatch | provider stack + gate → `OrderProviders` (P5); the rest stays |
| `pages/_document.tsx` | 55 | Tamagui SSR CSS collection | **stays** (framework shell) |
| `pages/index.tsx` | 7 | `<TableResolve code={null} />` | → `TableScanPage` (P4) |
| `pages/404.tsx` | 8 | `<TableResolve code={null} />` | → `TableScanPage` (P4) |
| `pages/t/[code]/index.tsx` | 14 | local `NextPage & {getLayout}` type; `() => null`; `getLayout` | → `MenuListPage` (P2) |
| `pages/t/[code]/products/[productId].tsx` | 24 | parses `productId`; renders `MenuItemDetail`; `getLayout` | → `MenuItemDetailPage` (P2) |
| `pages/t/[code]/cart/index.tsx` | 14 | `() => null`; `getLayout` | → `CartPage` (P3) |
| `pages/t/[code]/cart/items/[cartItemId].tsx` | 24 | parses `cartItemId`; renders `CartItemEdit`; `getLayout` | → `CartItemEditPage` (P3) |
| `pages/t/[code]/checkout.tsx` | 24 | reads `code`; renders `Checkout`; `getLayout` | → `CheckoutPage` (P4) |
| `pages/global.css` | — | `#__next` sizing | **stays** |

Everything else in the app — `next.config.js`, `tamagui.config.ts`, `project.json`, `tsconfig.json`,
`.eslintrc.json`, `vercel.json`, `public/` — is build configuration and is untouched by this work.

### 2.2 The reference shape, from `apps/pos-web`

```tsx
// apps/pos-web/src/pages/categories/create.tsx — the whole file
import { CategoryCreate } from '@gatherloop-pos/ui/pos';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  return {
    props: {},
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default CategoryCreate;
```

The pattern across all 56 POS route files is identical: an optional `getServerSideProps` (the only place
the app is allowed to talk to the framework's request) and `export default <CompositionRoot>`. Route
params are read there too — `parseInt(ctx.params?.productId ?? '')` in
`apps/pos-web/src/pages/products/[productId]/index.tsx` — and handed to the composition root as
props. No POS page renders JSX of its own.

### 2.3 Where the two apps genuinely differ, and why

The order app cannot copy the POS page shape verbatim, because the two differences below are real
and are not going away:

| | POS | Order |
|---|---|---|
| Rendering | SSR per request (`getServerSideProps` on every data page) | **Client-only**; the provider tree is gated on mount because `BrowserSessionRepository` touches `document.cookie`/`crypto` during construction (D5.1 in `docs/trd-order-app-nextjs-migration.md`) |
| Route params reach the root via | `ctx.params` → `props` | `router.query`, **empty until `router.isReady`** on a statically-optimised dynamic page (D5.2) |
| Route composition | one screen per URL | shared `getLayout` so `TableResolve`/`MenuList`/`Cart` reconcile by type across navigations instead of remounting (D4) |

So the order app needs a client-side equivalent of `getServerSideProps`' param reading, and it needs
somewhere to put the `getLayout` wiring. Today both live in `apps/`. Neither has to.

### 2.4 What already lives in the library

`libs/ui/src/app/order/` already holds the eight order composition roots
(`SessionProvider`, `CartProvider`, `TableResolve`, `MenuList`, `MenuItemDetail`, `Cart`,
`CartItemEdit`, `Checkout`) and one test (`CartItemEdit.test.tsx`). `libs/ui` also already:

- imports Next inside the library where it has to — `libs/ui/src/utils/queryParam.ts` imports
  `next/router`, `libs/ui/src/utils/url.ts` imports `GetServerSidePropsContext` from `next`;
- reads `NEXT_PUBLIC_*` inside a composition root — `libs/ui/src/app/order/Checkout.tsx`;
- ships a jest mock for `next/router` — `libs/ui/src/__mocks__/next/router.ts`, mapped in
  `libs/ui/jest.config.ts`;
- enforces the POS/order split with `no-restricted-imports` overrides in `libs/ui/.eslintrc.json`.

There is therefore no new mechanism to invent. This refactor moves code across a boundary that is
already open in the direction it needs to be open.

---

## 3. Target architecture

### 3.1 The rule

> An `apps/order-web` page file imports one symbol from `@gatherloop-pos/ui/order` and default-exports
> it. Everything else — route params, layout composition, provider stacks, readiness gating — lives
> in `libs/ui/src/app/order`.

`_app.tsx` and `_document.tsx` are the two exceptions, and they are framework shell, not composition:
`<Head>`, global CSS, `RootProvider`, the `getLayout` dispatch, and Tamagui's SSR style collection.
`apps/pos-web/src/pages/_app.tsx` carries exactly the same kind of content today.

### 3.2 Target tree

```
libs/ui/src/app/order/
├── OrderPage.ts                 # NEW  the `NextPage & { getLayout }` type, declared once
├── useOrderParams.ts            # NEW  useTableCode / useTableCodeParam / useNumericParam
├── useOrderParams.test.ts       # NEW
├── OrderProviders.tsx           # NEW  mount gate + SessionProvider + CartProvider
├── OrderProviders.test.tsx      # NEW
├── TableLayout.tsx              # MOVED from apps/order-web/src/components
├── TableLayout.test.tsx         # NEW   the D5.2 gate, finally testable
├── MenuLayout.tsx               # MOVED
├── CartLayout.tsx               # MOVED
├── TableScanPage.tsx            # NEW   `/` and `404`
├── MenuListPage.tsx             # NEW
├── MenuItemDetailPage.tsx       # NEW
├── CartPage.tsx                 # NEW
├── CartItemEditPage.tsx         # NEW
├── CheckoutPage.tsx             # NEW
├── SessionProvider.tsx          # unchanged
├── CartProvider.tsx             # unchanged
├── TableResolve.tsx             # unchanged
├── MenuList.tsx                 # unchanged
├── MenuItemDetail.tsx           # unchanged
├── Cart.tsx                     # unchanged
├── CartItemEdit.tsx             # unchanged
├── CartItemEdit.test.tsx        # unchanged
├── Checkout.tsx                 # unchanged
└── index.ts                     # + the new exports
```

```
apps/order-web/src/
├── pages/…                      # every route file is 2 lines; components/ is gone
└── pages/{_app,_document}.tsx   # framework shell only
```

### 3.3 The param hooks (P1)

```ts
// libs/ui/src/app/order/useOrderParams.ts
import { useRouter } from 'next/router';

// `router.query` is empty until hydration fills it in on a statically-optimised
// dynamic page, so `code` is undefined on first render (D5.2 in
// docs/trd-order-app-nextjs-migration.md). Callers that would otherwise flash
// the "scan the QR" screen need to tell "not yet" apart from "no code".
export type TableCodeState =
  | { status: 'pending' }
  | { status: 'ready'; code: string | null };

export const useTableCode = (): TableCodeState => {
  const router = useRouter();
  if (!router.isReady) return { status: 'pending' };
  const code = router.query['code'];
  return { status: 'ready', code: typeof code === 'string' ? code : null };
};

// For everything mounted *inside* a resolved TableLayout: by then the router is
// ready and the code is a string, so the readiness case is dead weight.
export const useTableCodeParam = (): string => {
  const code = useRouter().query['code'];
  return typeof code === 'string' ? code : '';
};

export const useNumericParam = (key: string): number => {
  const raw = useRouter().query[key];
  return typeof raw === 'string' ? Number(raw) : NaN;
};
```

`NaN` for a missing/garbage id is the behaviour the pages have today; `MenuItemDetail` and
`CartItemEdit` already handle it (the usecase 404s, the modal renders `null`). Preserved, not
improved — see §5.

### 3.4 The page entry components (P2–P4)

```tsx
// libs/ui/src/app/order/MenuListPage.tsx
import { MenuLayout } from './MenuLayout';
import { OrderPage } from './OrderPage';

// The menu route (FR-5/FR-7). Renders nothing itself — `MenuList` is mounted by
// `MenuLayout.getLayout` (D4) so it survives navigation to/from the item sheet.
export const MenuListPage: OrderPage = () => null;
MenuListPage.getLayout = (page) => <MenuLayout>{page}</MenuLayout>;
```

```tsx
// libs/ui/src/app/order/MenuItemDetailPage.tsx
export const MenuItemDetailPage: OrderPage = () => {
  const productId = useNumericParam('productId');
  return <MenuItemDetail productId={productId} />;
};
MenuItemDetailPage.getLayout = (page) => <MenuLayout>{page}</MenuLayout>;
```

…and the app side, in full:

```tsx
// apps/order-web/src/pages/t/[code]/products/[productId].tsx — the whole file
import { MenuItemDetailPage } from '@gatherloop-pos/ui/order';

export default MenuItemDetailPage;
```

All seven route files after the refactor:

| Page file | Contents |
|---|---|
| `index.tsx` | `export default TableScanPage` |
| `404.tsx` | `export default TableScanPage` |
| `t/[code]/index.tsx` | `export default MenuListPage` |
| `t/[code]/products/[productId].tsx` | `export default MenuItemDetailPage` |
| `t/[code]/cart/index.tsx` | `export default CartPage` |
| `t/[code]/cart/items/[cartItemId].tsx` | `export default CartItemEditPage` |
| `t/[code]/checkout.tsx` | `export default CheckoutPage` |

### 3.5 `_app.tsx` after P5

```tsx
import '@tamagui/core/reset.css';
import './global.css';

import { RootProvider } from '@gatherloop-pos/provider';
import { OrderPage, OrderProviders } from '@gatherloop-pos/ui/order';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ReactElement } from 'react';

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

type OrderAppProps = AppProps & { Component: OrderPage };

export default function App({ Component, pageProps }: OrderAppProps) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <>
      <Head>{/* unchanged */}</Head>
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <OrderProviders>{getLayout(<Component {...pageProps} />)}</OrderProviders>
      </RootProvider>
    </>
  );
}
```

`OrderProviders` owns what moved: the `mounted` state, the effect that flips it, the `null` render
before mount (D5.1), and the `SessionProvider`/`CartProvider` nesting.

### 3.6 `libs/ui/src/index.order.ts` after P6

The barrel keeps the four non-app exports `libs/provider` and the shell need
(`config`, `ConfirmationAlert`, `LoadingView`, `OrderLayout`, `MenuItemThumbnail`, `currency`), swaps
the eight inner composition roots for the seven page entries plus `OrderProviders` and `OrderPage`,
and stops exporting what no app imports any more. The inner roots stay reachable inside the library
through `./app/order/index.ts`; they are simply no longer public API.

`libs/provider/src/provider.tsx` imports `tamaguiConfig` and `ConfirmationAlertProvider` from
`@gatherloop-pos/ui/order` — both survive in the barrel, so `libs/provider` is untouched.

---

## 4. Decisions

### D1 — Route params are read in `libs`, through `next/router`, in `app/order/**` only

The alternative is `createParam` from `solito`, which the repo already depends on (`^4.2.2`) and
which would keep `app/order` framework-neutral. Rejected: solito exposes no `isReady`, and the
readiness distinction is load-bearing (§3.3, D5.2) — we would end up importing `next/router` anyway,
for one hook, alongside a second param mechanism. The order app is Next-on-web only; there is no
`order-mobile` and none is planned (`docs/trd-ui-presentation-split-by-app.md` D6 notes order has one
platform). `libs/ui/src/utils/queryParam.ts` already imports `next/router`, so this adds no new
dependency edge to the library.

`next/router` stays out of `app/pos/**` and out of every `presentation/` file, because those are
bundled by Metro for `apps/pos-mobile`. P6's lint rule states that.

### D2 — Navigation keeps using `solito/router`; only *reading* params uses `next/router`

`TableResolve`, `CartItemEdit`, and four order handlers already navigate through `solito/router`, and
`docs/trd-order-app-nextjs-migration.md` P8 deliberately moved them there. Nothing about param
reading needs those call sites to change, so they don't. Two imports, two jobs, no rewrite.

### D3 — Keep the props-taking composition roots; add thin `*Page` entries beside them

`MenuList({ tableCode })`, `MenuItemDetail({ productId })`, `Cart`, `CartItemEdit`, `Checkout` keep
their props. The `*Page` components read the route and pass them down.

The alternative — deleting the props and having each root read its own params — is fewer files, but
it makes every root untestable and unstoryable without a router in context, and it would rewrite
`CartItemEdit.test.tsx` (the one existing test in `app/order/`) as collateral. Props in, router at
the edge, is also what the POS does: `getServerSideProps` reads the request, `ProductUpdate` takes
`productUpdateParams`. The cost is seven ~6-line files.

### D4 — The layouts move to `app/order/`, not to `presentation/components/base/`

`TableLayout`/`MenuLayout`/`CartLayout` instantiate composition roots (`TableResolve`, `MenuList`,
`Cart`) and read the router. `docs/trd-ui-presentation-split-by-app.md` D5 defines `app/` as exactly
that layer — "instantiates the real repositories and usecases and renders a Handler" — while
`presentation/components/` is presentational and shared across both apps (D3 there). `OrderLayout`,
the presentational shell these render *into*, is already in `presentation/components/base/` and
stays there.

### D5 — `getLayout` is attached in `libs`, on the exported component

`MenuListPage.getLayout = …` in the library means the app never mentions layouts at all. Next reads
`Component.getLayout` off the default export by reference, and a re-export preserves the property, so
this works with no framework trickery. The alternative — libs exports layouts, apps attach
`getLayout` — leaves five lines of composition wiring in `apps/` for no gain.

### D6 — `/` and `404` share one `TableScanPage`

Both files render `<TableResolve code={null} />` today and are documented as the same outcome (D17 in
`docs/prd-table-ordering.md`). One component, two one-line pages. Neither gets a `getLayout`: they
are outside the `/t/[code]/**` shell and must not mount `TableResolve` twice.

### D7 — The readiness gate stays in `TableLayout`, it does not move into `TableResolve`

Tempting, since `TableResolve` already takes `code: string | null` and has a `resolving` variant. But
`TableResolve` is also rendered directly by `TableScanPage` with a deliberate, permanent `null`, and
folding the gate in would make that render a spinner forever or need a second flag. The gate is about
*the router*, so it belongs to the layout that reads the router.

### D8 — `OrderProviders` is one component, not a re-exported nesting

The mount gate and the two providers are one decision — "don't construct the browser session during
a server render, then hand the whole tree a session and a cart" — and they have one failure mode.
Splitting them would leave `_app.tsx` responsible for ordering them correctly, which is the thing
this TRD is removing. It also becomes the first testable version of that gate.

### D9 — A lint rule keeps the pages thin

`apps/order-web/.eslintrc.json` gains, for `src/pages/**` excluding `_app.tsx`/`_document.tsx`:

```json
{
  "files": ["src/pages/**/*.tsx"],
  "excludedFiles": ["src/pages/_app.tsx", "src/pages/_document.tsx"],
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["next/router", "react", "tamagui", "./*", "../*"],
          "message": "An order page re-exports a composition root from @gatherloop-pos/ui/order. Route params, layouts and providers belong in libs/ui/src/app/order. See docs/trd-order-app-composition-in-libs.md."
        }
      ]
    }]
  }
}
```

Banning relative imports is what actually forbids a new `src/components/`. `next` itself is not
banned — a future order page may legitimately need `GetServerSideProps`, the POS shape.

`libs/ui/.eslintrc.json` gains the mirror: `next/router` is restricted under
`src/app/pos/**` and `src/presentation/**` (Metro-bundled, per D1). `src/utils/queryParam.ts` is
outside both globs, so it is unaffected.

### D10 — No behaviour changes, deliberately, including the ones that look like bugs

`useNumericParam` returns `NaN` for a missing param; `useTableCodeParam` returns `''`. Both are
today's behaviour, kept verbatim so that a phase's diff is a move and nothing else. If `NaN` handling
deserves improving, that is a separate PR against `MenuItemDetail`/`CartItemEdit` with its own test —
not a rider on a refactor.

### D11 — The new `*Page` entries get no stories

They render `null` or one child, and they require a Next `RouterContext` (`useRouter()` returns
`null` outside one), which Storybook does not provide. The screens underneath them are already
storied (`MenuListScreen.stories.tsx`, `CartScreen.stories.tsx`, …) and stay so. The layouts and
`OrderProviders` get jest tests instead, where the existing `next/router` mock applies.

### D12 — `libs/ui/src/__mocks__/next/router.ts` needs a named `useRouter`

Today it exports only a default `Router` object (`replace`, `push`, `pathname`, `query`) — enough for
`utils/queryParam.ts`, not for a hook. P1 adds a named `useRouter` returning a mutable fake with
`isReady` and `query`, plus a helper to set them per test. Existing consumers of the default export
keep working; this is additive.

---

## 5. Parity contract (what must not change)

The acceptance bar for every phase. Anything here that regresses is a blocker, not a follow-up. It
is deliberately the same list as `docs/trd-order-app-nextjs-migration.md` §3, because this refactor's
whole claim is that nothing observable changes.

1. Every URL in §3.4 resolves to the same screen, including a hard navigation / refresh / QR scan
   straight to `/t/{code}/products/{id}` or `/t/{code}/cart/items/{id}`.
2. Opening an item sheet does **not** remount the menu: scroll position, search text and selected
   category survive open → close, and the menu does not refetch. Same for the cart and its edit modal.
3. The table resolves once per visit — no "Memuat meja…" flash moving menu → cart → checkout.
4. There is no "QR tidak valid" / scan-the-QR flash before the router is ready on a deep link (D5.2).
5. The cart survives navigation and a full page reload; the floating cart bar shows the same counts.
6. The anonymous session id is stable across reloads, and `X-Session-Id` is registered before the
   first request leaves (the mount gate, D5.1).
7. Copy stays Bahasa Indonesia; the shell stays a phone-width column pinned to `100dvh` with the
   footer above the iOS home indicator.
8. `apps/pos-web`, `apps/pos-mobile`, Storybook and every existing `libs/ui` test keep passing.
9. First Load JS for `/t/[code]` does not regress. The moved code is the same code; if the number
   moves more than noise, the barrel changed something it shouldn't have (§3.6, P6).

---

## 6. Phase plan

Each phase is one PR, ships on its own, and leaves the deployed app working. The order is a straight
line: each phase deletes the app-side file it replaced, so `src/components/` shrinks to nothing by
P4 rather than being emptied in one big-bang move.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P1 | `refactor(ui): move the order table layout into libs` | — | M |
| P2 | `refactor(ui): own the order menu routes in libs` | P1 | M |
| P3 | `refactor(ui): own the order cart routes in libs` | P2 | M |
| P4 | `refactor(ui): own the checkout and scan-QR routes in libs` | P3 | S |
| P5 | `refactor(ui): move the order provider stack into libs` | P4 | S |
| P6 | `chore(order-web): keep order pages thin` | P5 | S |
| P7 | `docs: refresh the order app architecture notes` | P6 | S |

### P1 — Table layout and the param hooks

**Adds** `libs/ui/src/app/order/OrderPage.ts`, `useOrderParams.ts` (§3.3) + `useOrderParams.test.ts`,
`TableLayout.tsx` (moved verbatim, `useRouter().isReady` swapped for `useTableCode()`) +
`TableLayout.test.tsx`.
**Touches** `libs/ui/src/__mocks__/next/router.ts` (D12), `libs/ui/src/app/order/index.ts`,
`libs/ui/src/index.order.ts` (export `TableLayout`, `OrderPage`),
`apps/order-web/src/components/{MenuLayout,CartLayout}.tsx` and
`apps/order-web/src/pages/t/[code]/checkout.tsx` (import `TableLayout` from
`@gatherloop-pos/ui/order`).
**Deletes** `apps/order-web/src/components/TableLayout.tsx`.

`TableLayout.test.tsx` is the point of the phase: assert the loading view while `isReady` is false,
`TableResolve` with the code once it is true, and `code: null` for a missing param — the D5.2
behaviour that has never had a test.

**Verify:** `nx run ui:test`; `nx run order-web:build`; `nx run order-web:dev` — deep-link
`/t/{code}` and confirm no scan-QR flash, and `/t/garbage` still shows "QR tidak valid".

### P2 — Menu routes

**Adds** `libs/ui/src/app/order/MenuLayout.tsx` (moved, reading `useTableCodeParam()`),
`MenuListPage.tsx`, `MenuItemDetailPage.tsx` (§3.4).
**Touches** `app/order/index.ts`, `index.order.ts`, `apps/order-web/src/pages/t/[code]/index.tsx` and
`.../products/[productId].tsx` — both down to two lines.
**Deletes** `apps/order-web/src/components/MenuLayout.tsx`.

**Verify:** `nx run ui:test`; `nx run order-web:build`. Then, by hand, **parity item 2**: scroll the
menu, type a search term, pick a category, open an item, close it with both the sheet's close button
and browser Back — scroll, search and category all survive and the Network tab shows no menu
refetch. Deep-link straight to `/t/{code}/products/{id}` and confirm the sheet opens over the menu.
Record `next build`'s First Load JS for `/t/[code]` in the PR description (parity item 9).

### P3 — Cart routes

**Adds** `libs/ui/src/app/order/CartLayout.tsx` (moved), `CartPage.tsx`, `CartItemEditPage.tsx`.
**Touches** `app/order/index.ts`, `index.order.ts`, `apps/order-web/src/pages/t/[code]/cart/index.tsx`
and `.../cart/items/[cartItemId].tsx`.
**Deletes** `apps/order-web/src/components/CartLayout.tsx` — and with it the `src/components/`
directory, since `TableLayout` went in P1 and `MenuLayout` in P2.

**Verify:** `nx run ui:test`; `nx run order-web:build`. By hand: add to cart → floating bar appears →
cart lists the line → open the edit modal (the cart stays visible behind it) → change amount and note
→ save → remove → clear-all confirmation. Android/browser Back dismisses the modal without leaving
the cart. Reload `/t/{code}/cart` and the cart is still there (parity item 5).

### P4 — Checkout and scan-QR

**Adds** `libs/ui/src/app/order/CheckoutPage.tsx`, `TableScanPage.tsx`.
**Touches** `app/order/index.ts`, `index.order.ts`,
`apps/order-web/src/pages/{index,404}.tsx` and `.../t/[code]/checkout.tsx`.

After this phase every route file in `apps/order-web/src/pages` is two lines except `_app`/`_document`.

**Verify:** `nx run order-web:build`; `/`, an unknown path, and `/t/{code}/checkout` all render as
before; menu → cart → checkout shows no "Memuat meja…" flash (parity item 3).

### P5 — Provider stack

**Adds** `libs/ui/src/app/order/OrderProviders.tsx` + `OrderProviders.test.tsx` (asserts nothing
renders before mount, and that `SessionProvider` wraps `CartProvider`).
**Touches** `apps/order-web/src/pages/_app.tsx` (§3.5), `app/order/index.ts`, `index.order.ts`.

**Verify:** `nx run ui:test`; `nx run order-web:build` **and** `nx run order-web:start` — a production
server render must not throw (this is what proves the mount gate survived the move); the session
cookie is stable across a reload and `X-Session-Id` is present on the first `/carts/*` request
(parity item 6).

### P6 — Guardrails and barrel

**Touches** `apps/order-web/.eslintrc.json` and `libs/ui/.eslintrc.json` (D9);
`libs/ui/src/index.order.ts` — drop the now-unused public exports of the inner roots (§3.6).

**Verify:** `npm run lint`; add a scratch `apps/order-web/src/pages/scratch.tsx` that imports
`next/router`, confirm lint fails, delete it. `nx run order-web:build` still succeeds, and First Load
JS for `/t/[code]` is unchanged from P2's recorded number (parity item 9).

### P7 — Documentation

**Touches** `docs-site/under-the-hood/clean-architecture.md` (state that order pages are re-exports,
the way the POS example already shows for `apps/pos-web`);
`docs/trd-order-app-nextjs-migration.md` §5.1/§5.4/P2, which still describe
`apps/order-web/src/components/TableLayout.tsx` as the app's "only new component" — annotate as
superseded by this TRD rather than rewriting history.

**Verify:** docs-site builds; the links resolve.

### The e2e suite

`apps/order-web-e2e/src/table-ordering.spec.ts` (359 lines) covers scan → browse → filter → open item
→ add to cart → reload → edit → remove → checkout, plus the deep-link case. It exercises the app
through the browser and touches no import path, so **it should be green, unchanged, after every
phase**. Run `nx run order-web-e2e:e2e` against a locally running API at least at P3 and P6; the
per-phase manual checks above are for the things it does not assert (remount preservation, flashes,
refetch counts).

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `getLayout` attached in `libs` doesn't survive the re-export, and every route loses its shell | Low, high impact | It is the same object reference, but P2 is the first phase that relies on it and its manual check is exactly "the menu renders inside the table shell". If it fails, fall back to attaching `getLayout` in the page (three extra lines per page, D5 only) — the layouts still live in `libs` |
| A layout moves and the mount-preservation guarantee (D4 in the migration TRD) silently breaks — the menu remounts behind the sheet | Medium, high impact | This is the one thing no automated test covers. P2 and P3 each carry it as a named, blocking manual check with a Network-tab assertion. Phases are small precisely so a regression has one candidate commit |
| `useRouter()` returns `null` outside a Next `RouterContext`, crashing Storybook or a test | Medium, contained | D11: the new entries get no stories. The library's jest `moduleNameMapper` already maps `next/router`; P1 extends that mock before anything depends on it |
| Barrel churn in `index.order.ts` drags the POS into the customer bundle (D6/D20 in the migration TRD) | Low, high impact | Every new export is a deep `./app/order/*` path, never `./app` or `./index`. P6 re-measures First Load JS against P2's recorded baseline |
| The refactor is invisible to users, so it competes with feature work and stalls half-done | Medium | Phases are ordered so that each one leaves the tree *more* consistent than it found it. The worst stopping point (after P1) is strictly better than today: `src/components/` has two files instead of three and the gate has a test |
| `next/router` inside `libs/ui` reaches the Metro bundle for `apps/pos-mobile` | Low | It cannot today: `apps/pos-mobile` imports `index.pos.ts`, which never reaches `app/order/**`. P6's mirror lint rule (D9) makes that structural rather than incidental |

---

## 8. Definition of done

- `apps/order-web/src/components/` does not exist.
- Every file under `apps/order-web/src/pages/` except `_app.tsx`, `_document.tsx` and `global.css` is
  an import line and a default export.
- No file under `apps/order-web/src/pages/` imports `react`, `tamagui`, `next/router`, or a relative
  path — enforced by lint, not convention.
- `libs/ui/src/app/order/` holds the layouts, the param hooks, the provider stack and the seven page
  entries, and `TableLayout`, `useOrderParams` and `OrderProviders` have tests.
- `nx run ui:test`, `npm run lint`, `nx run order-web:build`, `nx run pos-web:build` and
  `nx run order-web-e2e:e2e` are green.
- Every item in §5 verified by hand once, at P6.

---

## 9. Deliberately out of scope

- **`getServerSideProps` for the order app.** The customer app is client-only by design (D18 in
  `docs/prd-table-ordering.md`, D5 in the migration TRD). Making it SSR would let the pages read
  params the POS way, and it is a different TRD with a different risk profile (the session
  repository cannot run on the server).
- **Improving `NaN`/`''` param handling** (D10).
- **Splitting `libs/ui` into `libs/pos` and `libs/order`** — rejected with reasons in
  `docs/trd-ui-presentation-split-by-app.md` D8; nothing here changes that calculus.
- **Any change to `apps/pos-web` pages.** They are the reference, not the subject.

---

## References

- `docs/trd-order-app-nextjs-migration.md` — D4 (`getLayout` and mount preservation), D5.1/D5.2 (the
  mount gate and `router.isReady`), D6/D20 (the `@gatherloop-pos/ui/order` entry point)
- `docs/trd-ui-presentation-split-by-app.md` — D5 (`app/` is its own layer), D6 (composition roots
  stay in `libs/ui`), D7 (layer-major), D10 (the lint guardrail pattern)
- `docs/prd-table-ordering.md` — D17 (scan-the-QR fallback), FR-4 to FR-9
- `docs/prd-order-app-ux-improvements.md` — FR-9 (the cart item edit modal)
- `docs-site/under-the-hood/clean-architecture.md` — the four-layer description this refactor makes
  true for the order app
