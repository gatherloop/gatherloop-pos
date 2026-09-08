# TRD — Make `apps/order-web` look like `apps/pos-web`: composition in `libs`, rendered on the server

**Status:** proposed
**Scope:** `apps/order-web/src/**`, `libs/ui/src/app/order/**`, `libs/ui/src/data/{api,browser}/**`, `libs/ui/src/domain/repositories/{menu,publicTable,cart}.ts`, `libs/ui/src/index.order.ts`, `libs/api-contract/src/client.ts`, `libs/ui/.eslintrc.json`, `apps/order-web/.eslintrc.json`, `apps/order-web/.env.example`, `apps/order-web-e2e/playwright.config.ts`, Vercel env, `docs-site/under-the-hood/clean-architecture.md`
**Non-scope:** `apps/pos-web`, `apps/pos-mobile`, `apps/api`, `libs/provider`, App Router, the customer-facing UI itself — no screen, copy, layout, route or interaction changes
**Date of research:** 2026-09-08 (every claim below was checked against the code at `b5696b3`)

---

## 1. Problem statement

`apps/pos-web` has no `src/components/`. A POS page file is a framework adapter and nothing else: a
`getServerSideProps` that reads the request and instantiates repositories, then
`export default <CompositionRoot>` — where the composition root comes from `@gatherloop-pos/ui/pos`
and owns the whole vertical slice (repositories → usecases → handler → screen).
`apps/pos-web/src/pages/categories/create.tsx` is twelve lines, eleven of which are the auth
redirect.

`apps/order-web` differs on two axes, and they are the same problem seen twice.

**It carries composition in the app.** `src/components/` holds three layout components
(`TableLayout`, `MenuLayout`, `CartLayout`, 99 lines) that compose library screens, read route
params, and encode the mount-preservation rules from `docs/trd-order-app-nextjs-migration.md` (D4/D5.2).
Its page files parse route params by hand (`typeof router.query.productId === 'string' ? Number(...) : NaN`,
three times), declare a local `NextPage & { getLayout }` type five times, and wire `getLayout` per
page. `_app.tsx` owns the order-specific provider stack plus the mount gate.

**It renders client-only.** Not by preference — it had to. It was a static bundle on GitHub Pages, so
there was no server to render on and no server to mint a session (D18/D19 in
`docs/prd-table-ordering.md`, D2 in the migration TRD). **That constraint expired when the app moved
to Vercel.** What is left of it is a mount gate that makes the server emit an empty shell, a
`router.isReady` gate that exists because `router.query` is empty until hydration, and a QR scan that
paints a skeleton where the POS would have painted data.

The two are entangled: the reason the order app cannot read params the POS way (`ctx.params` → props)
is that it has no `getServerSideProps`, and the reason it has no `getServerSideProps` is a hosting
constraint that no longer applies. Fixing them separately means writing client-side param plumbing
and then deleting it. **This document fixes them as one change**, in nine phases, each one small,
reviewable and independently revertable.

**This document implements nothing.**

---

## 2. Current state audit

### 2.1 Everything in `apps/order-web/src` today

| File | Lines | What it does | Fate |
|---|---|---|---|
| `components/TableLayout.tsx` | 42 | `useRouter().isReady` gate → `LoadingView`; reads `code`; renders `TableResolve` | → `libs/ui/src/app/order/TableLayout.tsx`, gate deleted (P3) |
| `components/MenuLayout.tsx` | 30 | reads `code`; renders `TableLayout` → `MenuList` + `children` | → `libs/…/MenuLayout.tsx` (P4) |
| `components/CartLayout.tsx` | 27 | reads `code`; renders `TableLayout hideCartBar` → `Cart` + `children` | → `libs/…/CartLayout.tsx` (P5) |
| `pages/_app.tsx` | 65 | `<Head>`, CSS, `RootProvider`, **mount gate**, `SessionProvider`, `CartProvider`, `getLayout` dispatch | provider stack + gate → `OrderProviders` (P2); the rest stays |
| `pages/_document.tsx` | 55 | Tamagui SSR CSS collection | **stays** (framework shell) |
| `pages/index.tsx`, `pages/404.tsx` | 15 | `<TableResolve code={null} />` | → `TableScanPage` (P6) |
| `pages/t/[code]/index.tsx` | 14 | local `NextPage & {getLayout}` type; `() => null`; `getLayout` | → `MenuListPage` (P4) |
| `pages/t/[code]/products/[productId].tsx` | 24 | parses `productId`; renders `MenuItemDetail`; `getLayout` | → `MenuItemDetailPage` (P4, SSR in P7) |
| `pages/t/[code]/cart/index.tsx` | 14 | `() => null`; `getLayout` | → `CartPage` (P5) |
| `pages/t/[code]/cart/items/[cartItemId].tsx` | 24 | parses `cartItemId`; renders `CartItemEdit`; `getLayout` | → `CartItemEditPage` (P5, SSR in P7) |
| `pages/t/[code]/checkout.tsx` | 24 | reads `code`; renders `Checkout`; `getLayout` | → `CheckoutPage` (P6) |
| `pages/global.css` | — | `#__next` sizing | **stays** |

Everything else in the app — `next.config.js`, `tamagui.config.ts`, `project.json`, `tsconfig.json`,
`vercel.json`, `public/` — is build configuration, untouched except where P9 says otherwise.

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

The pattern across all 56 POS route files is identical: an optional `getServerSideProps` — the only
place the app talks to the framework's request — and `export default <CompositionRoot>`. Route params
are read there too (`parseInt(ctx.params?.productId ?? '')` in
`apps/pos-web/src/pages/products/[productId]/index.tsx`) and handed to the composition root as props.
No POS page renders JSX of its own.

### 2.3 The seeding contract already exists, unused

This is the finding that makes the whole plan cheap. **Every order usecase already accepts SSR seed
params and already starts in a loaded state when given them** — the exact contract the POS relies on:

| Usecase | Params | `getInitialState()` when seeded |
|---|---|---|
| `MenuListUsecase` | `{ products, categories, variants? }` | `type: products.length >= 1 ? 'loaded' : 'idle'` |
| `MenuItemDetailUsecase` | `{ productId, product? }` | `'selectingOptions'`/`'resolvingVariant'`, not `'idle'` |
| `TableResolveUsecase` | `{ code }` | `'noCode'`, or `'idle'` → resolves |
| `CartUsecase` | `{ cart? }` | `type: cart ? 'loaded' : 'idle'` |

`useController` (`libs/ui/src/presentation/controllers/controller.ts`) reads `getInitialState()` once,
into `useReducer`'s initial value. A seeded usecase therefore hydrates as loaded and never fires its
mount fetch — exactly how `apps/pos-web/src/pages/products/index.tsx` and `ProductListUsecase` work
today. Nobody has to build the seeding mechanism.

`libs/ui` also already does, elsewhere, everything this plan needs it to do: it imports `next/router`
(`src/utils/queryParam.ts`) and `next` types (`src/utils/url.ts`), reads `NEXT_PUBLIC_*` inside a
composition root (`src/app/order/Checkout.tsx`), ships a `next/router` jest mock, and enforces the
POS/order split with `no-restricted-imports` in `.eslintrc.json`. There is no new mechanism to
invent.

### 2.4 What actually blocks SSR

Three things, all fixable.

**(a) The API base URL is relative, and Node cannot resolve it.** `libs/api-contract/src/client.ts`
sets `baseURL: process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL']`, and
`apps/order-web/.env.example` sets that to `/api` — the same-origin path Next's `rewrites()` forwards
(D13 in the migration TRD). A browser resolves `/api` against the current origin; Node does not, so
the first `getServerSideProps` that touches a repository throws. This is already written down as a
known trap in `docs-site/public/screenshots/README.md`:

> `NEXT_PUBLIC_API_PROXY_BASE_URL` … must be an **absolute** URL. Setting it to a relative path like
> `/api` breaks every page that fetches data server-side in `getServerSideProps` … and every list
> page 500s.

The POS works around it by setting the var to an absolute URL (`apps/pos-web/.env.local`:
`http://localhost:3000/api`), which means every POS server-side request hairpins out of the Node
process, back into the same deployment, through `rewrites()`, and only then to the API — a wasted
round trip per request. That is not the fix to copy. See D2.

**(b) The session is minted in the browser, during render.** `BrowserSessionRepository`'s constructor
reads and writes `document.cookie`, touches `window.localStorage` and calls `crypto.randomUUID()` —
and `SessionProvider` constructs it inside `useState(() => …)`, which runs on the server too. That is
the entire reason `_app.tsx` gates the tree on `mounted` (D5.1 in the migration TRD).

There is a quieter hazard in the same place. `CartUsecase` auto-fetches from `idle`, and
`useCartController`'s effect runs **before** `SessionProvider`'s (React runs child effects before
parent effects), so the `X-Session-Id` interceptor is registered after the cart controller first
fires. It works only because the cart machine takes two effect passes to reach a network call —
`idle` → dispatch `FETCH` → re-render → `loading` → fetch — by which time the parent effect has run.
Nothing states that invariant and nothing tests it. See D3.

**(c) The layouts need the data, but only pages can fetch it.** In the Pages Router only a page
exports `getServerSideProps`, and the thing that renders `TableResolve` and `MenuList` is a
`getLayout` layout. The data and its consumer are on opposite sides of the boundary. See D6.

---

## 3. Target architecture

### 3.1 The rule

> An `apps/order-web` page file imports from `@gatherloop-pos/ui/order`, re-exports a loader as
> `getServerSideProps`, and default-exports a composition root. Everything else — route params,
> layout composition, provider stacks, data loading — lives in `libs/ui/src/app/order`.

`_app.tsx` and `_document.tsx` are the two exceptions, and they are framework shell, not composition:
`<Head>`, global CSS, `RootProvider`, the `getLayout` dispatch, and Tamagui's SSR style collection.
`apps/pos-web/src/pages/_app.tsx` carries the same kind of content today.

### 3.2 Target tree

```
libs/ui/src/app/order/
├── OrderPage.ts                 # NEW  the `NextPage & { getLayout }` type, declared once
├── serverSession.ts             # NEW  resolveSession(ctx): read-or-mint + Set-Cookie
├── serverTable.ts               # NEW  resolveTable(ctx): fetch by ctx.params.code
├── loaders.ts                   # NEW  the six getServerSideProps implementations
├── OrderProviders.tsx           # NEW  SessionProvider + CartProvider, no mount gate
├── TableLayout.tsx              # MOVED from apps/, seeded from props
├── MenuLayout.tsx               # MOVED, seeded from props
├── CartLayout.tsx               # MOVED
├── TableScanPage.tsx            # NEW   `/` and `404`
├── MenuListPage.tsx             # NEW
├── MenuItemDetailPage.tsx       # NEW
├── CartPage.tsx                 # NEW
├── CartItemEditPage.tsx         # NEW
├── CheckoutPage.tsx             # NEW
├── SessionProvider.tsx          # CHANGED  takes a sessionId, reconciles in an effect
├── CartProvider.tsx             # unchanged
├── TableResolve.tsx             # unchanged
├── MenuList.tsx                 # unchanged
├── MenuItemDetail.tsx           # unchanged
├── Cart.tsx                     # unchanged
├── CartItemEdit.tsx             # unchanged
├── Checkout.tsx                 # unchanged
└── index.ts

libs/ui/src/data/browser/
└── cookieSession.ts             # NEW, replaces session.ts's minting path
```

```
apps/order-web/src/
├── pages/…                      # every route file is 3 lines; components/ is gone
└── pages/{_app,_document}.tsx   # framework shell only
```

### 3.3 A page, in full

```tsx
// apps/order-web/src/pages/t/[code]/products/[productId].tsx — the whole file
import {
  MenuItemDetailPage,
  menuItemDetailServerSideProps,
} from '@gatherloop-pos/ui/order';

export const getServerSideProps = menuItemDetailServerSideProps;
export default MenuItemDetailPage;
```

All seven route files after the refactor:

| Page file | Default export | Loader |
|---|---|---|
| `index.tsx` | `TableScanPage` | `tableScanServerSideProps` (session only) |
| `404.tsx` | `TableScanPage` | — (`404` cannot have one; see D14) |
| `t/[code]/index.tsx` | `MenuListPage` | `menuListServerSideProps` (session, table, menu) |
| `t/[code]/products/[productId].tsx` | `MenuItemDetailPage` | `menuItemDetailServerSideProps` (+ product) |
| `t/[code]/cart/index.tsx` | `CartPage` | `cartServerSideProps` (session, table) |
| `t/[code]/cart/items/[cartItemId].tsx` | `CartItemEditPage` | `cartItemEditServerSideProps` |
| `t/[code]/checkout.tsx` | `CheckoutPage` | `checkoutServerSideProps` (session, table) |

### 3.4 The loaders

Each composes two helpers, both in `libs`:

```ts
// libs/ui/src/app/order/loaders.ts (shape, not final code)
export const menuListServerSideProps: GetServerSideProps<MenuListPageProps> = async (ctx) => {
  const sessionId = resolveSession(ctx);            // read-or-mint + Set-Cookie (D3)
  const table = await resolveTable(ctx);            // ctx.params.code -> PublicTable | null
  const menu = await new ApiMenuRepository(new QueryClient()).fetchMenu({ query: '' });
  return { props: { sessionId, table, menu } };
};
```

`resolveTable` returns `null` for a missing or unknown code; `TableResolve`'s existing `noCode` and
`notFound` states render exactly what they render today. The catalog is public, so its fetch forwards
no session.

### 3.5 `_app.tsx` after P2

```tsx
export default function App({ Component, pageProps }: OrderAppProps) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <>
      <Head>{/* unchanged */}</Head>
      <RootProvider tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}>
        <OrderProviders sessionId={pageProps.sessionId}>
          {getLayout(<Component {...pageProps} />, pageProps)}
        </OrderProviders>
      </RootProvider>
    </>
  );
}
```

Two changes from today: `OrderProviders` replaces the inline `mounted` gate + provider nesting, and
`getLayout` receives `pageProps` so the layouts can read the seeded table and menu (D6).

### 3.6 `libs/ui/src/index.order.ts` after P8

Keeps what `libs/provider` and the shell need (`config` — `tamaguiConfig` and
`ConfirmationAlertProvider` are imported by `libs/provider/src/provider.tsx` — plus `LoadingView`,
`OrderLayout`, `MenuItemThumbnail`, `currency`), and swaps the eight inner composition roots for the
seven page entries, their loaders, `OrderProviders` and `OrderPage`. The inner roots stay reachable
inside the library through `./app/order/index.ts`; they are simply no longer public API.

---

## 4. The cost, stated plainly

**Every client-side navigation between order routes gains a server round trip.** Next fetches
`/_next/data/<buildId>/….json` and waits for `getServerSideProps` before rendering the next route.
Today, tapping a menu item renders the sheet *immediately* with a skeleton and fills it in when the
product arrives. With SSR on that route, the tap does nothing visible until the server responds, then
the sheet appears fully populated.

On a fast connection that is 100–200 ms and reads as "instant". In a restaurant, on shared wifi, on
the customer's phone — the environment this app was designed for
(`docs/prd-order-app-ux-improvements.md`) — it can be a second of apparent unresponsiveness on the
most-used interaction in the product.

That is the trade. What it buys:

| Win | Size |
|---|---|
| A QR scan paints the real menu instead of a skeleton — one round trip instead of three sequential ones (HTML → JS → table resolve → menu fetch) | **Large.** This is the app's entry path; every guest pays it once |
| No "Memuat meja…" gate, no `router.isReady` flash, no empty server shell | Medium |
| The mount gate, the readiness gate and the interceptor-ordering hazard (§2.4b) all disappear | Medium |
| `apps/order-web` pages become structurally identical to `apps/pos-web` pages | The stated goal |

The plan resolves this by **separating arrival from navigation**: SSR the table shell and the menu
unconditionally (P3, P4 — pure wins, they only affect arrival paths), then SSR the two overlay routes
behind a measurement with a pre-agreed fallback (P7, D13).

---

## 5. Decisions

### D1 — `getServerSideProps`, Pages Router, no App Router

The POS is Pages Router and convergence is the point. Server Components would make §2.4c disappear
entirely — a layout could fetch its own data — which is the strongest argument for App Router anyone
in this repo has, and it is also a rewrite of both frontends' routing. Not now. `getStaticProps` +
ISR is tempting for the menu (it is the same for every guest) but the table code is a route param
with an unbounded value space and the catalog changes whenever staff edit a product; see D15.

### D2 — `client.ts` resolves the base URL per execution environment

```ts
const serverBaseUrl =
  process.env['API_INTERNAL_BASE_URL'] ?? process.env['NEXT_PUBLIC_API_BASE_URL'];
const browserBaseUrl =
  process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'];

export const axiosInstance = axios.create({
  baseURL:
    typeof window === 'undefined' ? serverBaseUrl ?? browserBaseUrl : browserBaseUrl,
});
```

The server calls the API origin directly; the browser keeps calling `/api`, so D13's proxy keeps
doing its job (no CORS, no preflight) unchanged. The `?? browserBaseUrl` tail is what makes this safe
for `apps/pos-web` and `apps/pos-mobile`: with neither server var set, every consumer resolves
byte-identically to today. React Native has no `window`, so the fallback also keeps Metro on the
browser branch. POS deployments can opt into the direct hop later by setting the var; that is their
change to make, not this document's.

### D3 — The session id is minted on the server and passed down as a value

`resolveSession(ctx)` reads `gl_session_id` from `ctx.req.cookies`, validates it against the UUIDv4
pattern `BrowserSessionRepository` already uses, and mints + `Set-Cookie`s one (same `Max-Age`,
`Path`, `SameSite`, `Secure` attributes) when it is missing or malformed. `BrowserSessionRepository`
is replaced by a repository that is *given* an id:

```ts
export class CookieSessionRepository implements SessionRepository {
  constructor(private readonly sessionId: string) {}
  getSessionId = () => this.sessionId;
  // getTableCode / setTableCode keep reading localStorage lazily — they are
  // called from effects and event handlers, never during render.
}
```

`SessionProvider` takes `sessionId` as a prop and does the cookie/localStorage reconciliation in an
effect, where touching `document` is legal. Server and client compute the same id from the same
cookie, so there is no hydration mismatch, no mount gate, and no dependence on effect ordering: the
id is available synchronously on the first render.

The cookie stays readable from JavaScript (not `HttpOnly`) — D4 needs it — and the browser still
sends `X-Session-Id` as a header rather than relying on the cookie travelling (D22 in
`docs/prd-table-ordering.md`, unchanged).

### D4 — The localStorage mirror still wins on the client

Safari's ITP evicts the cookie; the localStorage mirror is what survives, and re-promoting it is what
keeps a guest's cart across that eviction. But the server, seeing no cookie, will have minted a *new*
id for that same request.

Rule: **the server's id is authoritative for the SSR pass; a valid, differing localStorage id wins on
the client**, is re-promoted to the cookie in `SessionProvider`'s effect, and the cart refetches once
under it. Cost: one wasted server-side mint and one client refetch, at most once per eviction.
Benefit: the ITP guarantee is preserved exactly as documented today.

### D5 — The cart is **not** server-rendered

It is per-session, so an SSR'd cart makes every response private and uncacheable, and it would force
`_app.tsx` to thread `pageProps.cart` into `CartProvider` — reintroducing the coupling this document
removes. The floating bar popping in a beat after paint is what happens today, so this is parity, not
a regression. `CartParams.cart` stays in the domain layer, unused, for when D15 revisits it.

This also keeps the catalog routes' HTML identical for every guest, which is what makes the caching
follow-up possible at all.

### D6 — `getLayout(page, pageProps)`

`OrderPage`'s type widens to `(page: ReactElement, pageProps: any) => ReactNode`, and `_app.tsx`
passes the props through (§3.5). The layouts read `pageProps.table` / `pageProps.menu` and pass them
into `TableResolve` / `MenuList` as the seed params those usecases already accept (§2.3). This is the
standard Pages Router shape for exactly this problem.

### D7 — Loaders live in `libs`, not in the pages

This is where the order app deliberately goes *further* than the POS. `apps/pos-web` repeats
`const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization')` in 56 files; that is the shape
§3.1 exists to avoid. So the loaders live in `libs/ui/src/app/order/loaders.ts` and a page is three
lines. Nothing about the pattern is order-specific — if it proves out, the POS can adopt it later
(§11).

### D8 — `getLayout` is attached in `libs`, on the exported component

`MenuListPage.getLayout = (page) => <MenuLayout>{page}</MenuLayout>` in the library means the app
never mentions layouts at all. Next reads `Component.getLayout` off the default export by reference,
and a re-export preserves the property. The alternative — libs exports layouts, apps attach
`getLayout` — leaves five lines of composition wiring in `apps/` for no gain.

### D9 — Keep the props-taking composition roots; add thin `*Page` entries beside them

`MenuList({ tableCode })`, `MenuItemDetail({ productId })`, `Cart`, `CartItemEdit`, `Checkout` keep
their props. The `*Page` components take the loader's props and pass them down.

The alternative — deleting the props and having each root read its own context — makes every root
untestable and unstoryable without a router, and would rewrite `CartItemEdit.test.tsx` (the one
existing test in `app/order/`) as collateral. Props in, framework at the edge, is also exactly what
the POS does: `getServerSideProps` reads the request, `ProductUpdate` takes `productUpdateParams`.
The cost is seven ~6-line files.

### D10 — The layouts move to `app/order/`, not to `presentation/components/base/`

`TableLayout`/`MenuLayout`/`CartLayout` instantiate composition roots (`TableResolve`, `MenuList`,
`Cart`). `docs/trd-ui-presentation-split-by-app.md` D5 defines `app/` as exactly that layer, while
`presentation/components/` is presentational and shared across both apps (D3 there). `OrderLayout`,
the presentational shell these render *into*, is already in `presentation/components/base/` and stays
there.

### D11 — No client-side route-param reading survives

`code` and `productId` come from `ctx.params` and arrive as props, exactly as
`apps/pos-web/src/pages/products/[productId]/index.tsx` gets `productId`. `TableLayout`'s
`router.isReady` gate goes with them: there is nothing to wait for when the value is a prop. Keeping
a client-side path "just in case" would mean two sources of truth for the table code, which is how
the D5.2 flash bug existed in the first place.

D13's fallback is the one exception: if the two overlay routes lose their loaders, they read
`router.query` in their `*Page` entry, in `libs`, and `libs/ui/src/__mocks__/next/router.ts` gains a
named `useRouter` (it exports only a default `Router` object today).

### D12 — `TableScanPage` serves both `/` and `404`

Both files render `<TableResolve code={null} />` today and are documented as the same outcome (D17 in
`docs/prd-table-ordering.md`). One component, two three-line pages. Neither gets a `getLayout`: they
are outside the `/t/[code]/**` shell and must not mount `TableResolve` twice.

### D13 — The overlay routes get SSR too, with a stated fallback

`t/[code]/products/[productId]` and `t/[code]/cart/items/[cartItemId]` render on top of a mounted
menu/cart, so they are where §4's navigation cost is most visible — and also the routes where a deep
link currently shows *two* stacked skeletons.

They get loaders in P7, and P7's acceptance check is a measurement: p75 delay between tapping a menu
card and the sheet appearing, on a throttled connection, against the same measurement taken before.
**If it regresses past 300 ms, drop `getServerSideProps` from those two routes** — three lines per
page, `MenuItemDetail`/`CartItemEdit` keep client-fetching as they do today, and every other route
keeps its SSR. Deciding this in advance is the point; deciding it under pressure after P7 is not.

### D14 — `404.tsx` gets no loader

Next does not run `getServerSideProps` for the built-in 404 page. `TableScanPage` therefore has to
render without a `sessionId` prop, which it can: it shows the scan-the-QR screen and touches no cart.
`OrderProviders` treats a missing `sessionId` as "mint on the client in an effect" — the one
remaining client-mint path, reached only by unmatched URLs.

### D15 — No CDN caching in this document

`Cache-Control: private, no-store`, which is what Next sends by default. Edge-caching the menu route
is a real opportunity — D5 keeps the HTML guest-independent precisely so it stays available — but it
interacts with the `Set-Cookie` on a first visit and with staff catalog edits, and it is worth its own
document rather than a paragraph here.

### D16 — A lint rule keeps the pages thin

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
          "message": "An order page re-exports a loader and a composition root from @gatherloop-pos/ui/order. Route params, layouts, providers and data loading belong in libs/ui/src/app/order. See docs/trd-order-app-composition-and-ssr.md."
        }
      ]
    }]
  }
}
```

Banning relative imports is what actually forbids a new `src/components/`. `next` itself stays
allowed — a page may need `GetServerSideProps` as a type.

`libs/ui/.eslintrc.json` gains the mirror: `next/router` is restricted under `src/app/pos/**` and
`src/presentation/**`, which Metro bundles for `apps/pos-mobile`. `src/utils/queryParam.ts` is
outside both globs and is unaffected.

### D17 — Behaviour is preserved, including the parts that look like bugs

Today a garbage `productId` yields `NaN`, the usecase 404s, and the sheet renders nothing. Under SSR
the loader could return `notFound: true` instead. **It does not** — it seeds `product: null` and the
existing states render what they render today. If that deserves improving, it is a separate PR with
its own test, not a rider on a refactor.

### D18 — The new `*Page` entries get no stories

They render `null` or one child and take props a Storybook story would have to fabricate. The screens
underneath them are already storied (`MenuListScreen.stories.tsx`, `CartScreen.stories.tsx`, …) and
stay so. The layouts, `OrderProviders`, `resolveSession` and `CookieSessionRepository` get jest tests
instead.

---

## 6. Parity contract

The acceptance bar for every phase. Anything here that regresses is a blocker, not a follow-up.

1. Every URL in §3.3 resolves to the same screen, including a hard navigation / refresh / QR scan
   straight to `/t/{code}/products/{id}` or `/t/{code}/cart/items/{id}`.
2. **Opening an item sheet does not remount the menu**: scroll position, search text and selected
   category survive open → close, and the menu does not refetch. Same for the cart and its edit modal.
   SSR seeds `getInitialState()`, which `useController` reads only on first mount — so navigation
   must not re-seed a mounted usecase. Checked explicitly in P4.
3. The table resolves once per visit — no "Memuat meja…" flash moving menu → cart → checkout.
4. No scan-the-QR or "QR tidak valid" flash before the real screen on a deep link. Under SSR this
   should become impossible rather than merely fixed.
5. The cart survives navigation and a full page reload, **including across cookie eviction with an
   intact localStorage mirror** (D4). Checked explicitly in P2.
6. The anonymous session id is stable across reloads, and `X-Session-Id` is on every `/carts/*`
   request and on nothing else.
7. Copy stays Bahasa Indonesia; the shell stays a phone-width column pinned to `100dvh` with the
   footer above the iOS home indicator.
8. Existing printed QR codes keep working.
9. `apps/pos-web`, `apps/pos-mobile`, Storybook and every existing `libs/ui` test keep passing.
10. **Tap-to-sheet latency does not regress past 300 ms at p75** on a throttled connection (D13).
11. **No hydration mismatch warnings** on any route, in development or production.

---

## 7. Phase plan

Each phase is one PR, ships on its own, and leaves the deployed app working. P1 and P2 change no
rendering; the first user-visible change is P3.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P1 | `fix(api-contract): resolve the API base URL per environment` | — | S |
| P2 | `refactor(ui): mint the order session on the server` | P1 | M |
| P3 | `refactor(ui): server-render the order table shell` | P2 | M |
| P4 | `refactor(ui): own and server-render the menu routes` | P3 | M |
| P5 | `refactor(ui): own the cart routes` | P4 | M |
| P6 | `refactor(ui): own the checkout and scan-QR routes` | P5 | S |
| P7 | `feat(order-web): server-render the item sheet and cart-item routes` | P6 | M |
| P8 | `chore(order-web): keep order pages thin` | P7 | S |
| P9 | `docs: refresh the order app architecture notes` | P8 | S |

### P1 — Base URL, and the repository `options` parameter

**Touches** `libs/api-contract/src/client.ts` (D2); `libs/ui/src/data/api/{menu,publicTable,cart}.ts`
and their domain interfaces — each method gains `options?: Partial<RequestConfig>`, forwarded to the
kubb client, exactly as `ApiProductRepository.fetchProductById(productId, options?)` already does;
`apps/order-web/.env.example` (document `API_INTERNAL_BASE_URL`).

No component changes, no rendering changes. This phase stands alone because it is the one that can
silently break `apps/pos-web` and `apps/pos-mobile`, and it should be reviewable without any
order-app noise in the diff.

**Verify:** `nx run ui:test`; `nx run pos-web:build` and a POS list page renders server-side against a
local API (proves the fallback branch); `nx run order-web-e2e:e2e` green; **a scratch
`getServerSideProps` in the order app that calls `ApiPublicTableRepository` returns data instead of
throwing on a relative URL** — this is the phase's real acceptance test. Delete the scratch page
before merging.

### P2 — Server-minted session, and the provider stack moves to `libs`

**Adds** `libs/ui/src/app/order/serverSession.ts` + tests; `libs/ui/src/data/browser/cookieSession.ts`
+ tests; `libs/ui/src/app/order/{OrderPage.ts,OrderProviders.tsx,loaders.ts}` (session-only loaders
for now) + `OrderProviders.test.tsx`.
**Touches** `SessionProvider` (takes `sessionId`, reconciles in an effect, D3/D4); `_app.tsx` (§3.5,
minus the `getLayout` props change); every page file (gains its loader line).
**Deletes** `BrowserSessionRepository`'s minting path and `_app.tsx`'s `mounted` gate.

The server now renders the real tree instead of `null`. Nothing is seeded yet, so every screen still
starts `idle` and fetches on mount — first paint gains the shell and the skeletons, not the data.
That is deliberate: **this phase's risk is hydration, and it is much easier to diagnose with one
variable changed.**

**Verify:** `nx run ui:test`; `nx run order-web:build && nx run order-web:start` — view source on
`/t/{code}` shows the shell in the HTML, with **no hydration warning in the console** (parity item
11). The session cookie survives a reload; deleting the cookie while keeping
`localStorage.gl_session_id` restores the same cart (parity item 5, D4); `X-Session-Id` is on every
`/carts/*` request and on nothing else. `nx run order-web-e2e:e2e` green.

**If hydration cannot be made clean here, stop and take §7.1's fallback** — do not start P3.

### P3 — Table shell

**Adds** `libs/ui/src/app/order/serverTable.ts` + tests; `libs/ui/src/app/order/TableLayout.tsx`
(moved from `apps/`, seeded from props, `isReady` branch **not** carried over — D11) +
`TableLayout.test.tsx`.
**Touches** the five `/t/[code]/**` loaders (add `resolveTable`); `_app.tsx` (`getLayout(page, pageProps)`,
D6); `apps/order-web/src/components/{MenuLayout,CartLayout}.tsx` and
`pages/t/[code]/checkout.tsx` (import `TableLayout` from `@gatherloop-pos/ui/order`).
**Deletes** `apps/order-web/src/components/TableLayout.tsx`.

**Verify:** `nx run ui:test`; view source on `/t/{code}` contains the table name; a hard navigation to
a garbage code returns the "QR tidak valid" screen with **no flash of anything else** (parity item 4);
menu → cart → checkout shows no "Memuat meja…" (parity item 3); `TableResolve` does not re-resolve on
in-app navigation. `nx run order-web-e2e:e2e` green.

### P4 — Menu routes

**Adds** `libs/ui/src/app/order/MenuLayout.tsx` (moved, seeded), `MenuListPage.tsx`,
`MenuItemDetailPage.tsx`.
**Touches** `menuListServerSideProps` (adds the `fetchMenu` call — the catalog is public, so it
forwards no session); `app/order/index.ts`; `index.order.ts`; the two menu page files, down to three
lines each.
**Deletes** `apps/order-web/src/components/MenuLayout.tsx`.

This is the phase the customer feels: a QR scan paints the menu, not a skeleton.

**Verify:** view source on `/t/{code}` contains product names. Record, in the PR description, the
before/after Largest Contentful Paint on a throttled connection — the number that justifies this
whole document — and the transferred-bytes delta (the menu now appears twice: SSR markup and
`__NEXT_DATA__`). Then **parity item 2, the blocking check**: scroll the menu, type a search term,
pick a category, open an item, close it with both the sheet's close button and browser Back — scroll,
search and category all survive, and the Network tab shows no menu refetch and no remount.

### P5 — Cart routes

**Adds** `libs/ui/src/app/order/CartLayout.tsx` (moved), `CartPage.tsx`, `CartItemEditPage.tsx`.
**Touches** the two cart loaders (session + table, no cart — D5); `app/order/index.ts`;
`index.order.ts`; the two cart page files.
**Deletes** `apps/order-web/src/components/CartLayout.tsx` — and with it the `src/components/`
directory.

**Verify:** add to cart → the floating bar appears → the cart lists the line → open the edit modal
(the cart stays visible behind it) → change amount and note → save → remove → clear-all confirmation.
Browser/Android Back dismisses the modal without leaving the cart. Reload `/t/{code}/cart` and the
cart is still there (parity item 5).

### P6 — Checkout and scan-QR

**Adds** `CheckoutPage.tsx`, `TableScanPage.tsx` (D12, D14).
**Touches** `app/order/index.ts`, `index.order.ts`, `pages/{index,404}.tsx`,
`pages/t/[code]/checkout.tsx`.

After this phase every route file is three lines except `_app`/`_document`.

**Verify:** `/`, an unknown path and `/t/{code}/checkout` render as before; the 404 path mints a
session client-side without errors (D14).

### P7 — SSR the overlay routes, and measure

**Touches** `menuItemDetailServerSideProps` and `cartItemEditServerSideProps` (seed `product` into
`MenuItemDetailParams`).

**Verify:** deep-link `/t/{code}/products/{id}` → the sheet renders populated over a populated menu,
no stacked skeletons. Then **D13's measurement**: tap-to-sheet p75 on a throttled connection, before
vs. after. If it regressed past 300 ms, take D13's fallback **in this same PR** and say so in the
description.

### P8 — Guardrails and barrel

**Touches** `apps/order-web/.eslintrc.json`, `libs/ui/.eslintrc.json` (D16); `index.order.ts` (§3.6).

**Verify:** `npm run lint`; add a scratch page importing `next/router`, confirm lint fails, delete it.
`nx run order-web:build` succeeds and First Load JS for `/t/[code]` is unchanged from P4's recorded
number.

### P9 — Environment, e2e and documentation

**Touches** `apps/order-web/.env.example` and the Vercel project env (`API_INTERNAL_BASE_URL`);
`apps/order-web-e2e/playwright.config.ts` (its `webServer.env` sets
`NEXT_PUBLIC_API_PROXY_BASE_URL: '/api'` with no server-side var — it needs one);
`docs-site/under-the-hood/clean-architecture.md`; `docs/trd-order-app-nextjs-migration.md` §2.3/§5.1/§5.4
and D5, which state "No SSR" as the runtime posture and describe
`apps/order-web/src/components/TableLayout.tsx` as the app's "only new component" — annotate as
superseded here rather than rewriting history.

**Verify:** a clean `nx run order-web-e2e:e2e` from a fresh checkout with only `.env.example`'s
variables set; a Vercel preview deploy serves a real QR-scan path end to end.

### The e2e suite

`apps/order-web-e2e/src/table-ordering.spec.ts` (359 lines) covers scan → browse → filter → open item
→ add to cart → reload → edit → remove → checkout, plus the deep-link case. It exercises the app
through the browser and touches no import path, so **it should be green, unchanged, after every
phase.** Run it at least at P2, P5 and P8; the per-phase manual checks are for what it does not
assert (remount preservation, flashes, refetch counts, latency).

### 7.1 If hydration cannot be made clean (the fallback)

P2 is the risk probe. If the Tamagui/react-native-web tree cannot be server-rendered without
mismatches, the composition half of this plan still stands on its own:

- Keep `_app.tsx`'s mount gate inside `OrderProviders` and drop the loaders.
- P3–P6 proceed as pure moves; `TableLayout` keeps its `router.isReady` gate and the layouts read
  route params through a `useOrderParams` hook in `libs/ui/src/app/order` (`next/router`, plus the
  named `useRouter` mock from D11). Pages become two lines instead of three.
- P7 is dropped; P8 and P9 are unchanged except for the env work.

The end state is then §3.1 minus SSR — which is the whole of the original goal, and which is where the
POS's own pages were before they had `getServerSideProps`.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Hydration mismatch from `react-native-web`/Tamagui**, which the mount gate has hidden since the migration (D5 there: "the server emits an empty shell — there is nothing to mismatch") | **Medium, and this is the one to watch** | P2 exists precisely to surface it with one variable changed and nothing seeded. `apps/pos-web` server-renders the same stack on 56 pages today, which is strong evidence — but the order app's components are not the POS's. §7.1 is the pre-agreed fallback |
| **The navigation round trip makes the app feel slower** than the client-only version it replaces | Medium, high impact | §4 is honest that this is a trade. D13 fixes the threshold and the fallback in advance; P7 measures before committing. P3/P4 are net wins regardless — they only affect arrival paths |
| P1 changes the base URL for `apps/pos-web`/`apps/pos-mobile` and breaks them | Low, **very** high impact | The `?? browserBaseUrl` fallback means "no server var set" resolves byte-identically to today. P1 is standalone and its acceptance test is a POS page rendering server-side |
| **A layout moves and the mount-preservation guarantee breaks** — the menu remounts behind the sheet, losing scroll/search | Medium, high impact | The one thing no automated test covers. P4 and P5 each carry it as a named, blocking manual check with a Network-tab assertion. SSR sharpens the risk: seeded state is read only on first mount, so a remount would now also re-seed |
| A guest's cart appears empty after Safari evicts the cookie | Low, high impact | D4's rule, tested in P2. This is the case the localStorage mirror exists for, and server minting is what threatens it |
| `getLayout` attached in `libs` doesn't survive the re-export, and every route loses its shell | Low | It is the same object reference. P4 is the first phase that relies on it and its manual check is "the menu renders inside the table shell". Fallback: attach `getLayout` in the page (three lines each, D8 only) |
| The menu payload inflates the HTML — every product, category and variant inlined twice | Medium | P4 records the transferred-bytes delta alongside LCP. If JSON dominates, trim `MenuListParams` to the fields the cards render; do not abandon SSR |
| Barrel churn in `index.order.ts` drags the POS into the customer bundle (D6/D20 in the migration TRD) | Low, high impact | Every new export is a deep `./app/order/*` path, never `./app` or `./index`. P8 re-measures First Load JS against P4's baseline |
| `next/router` inside `libs/ui` reaches the Metro bundle for `apps/pos-mobile` | Low | It cannot today: `apps/pos-mobile` imports `index.pos.ts`, which never reaches `app/order/**`. D16's mirror rule makes that structural rather than incidental |
| SSR puts the Vercel Node runtime on the critical path for a QR scan | Low | Already true since D13's proxy put Vercel on every API call; this adds weight to an existing dependency, not a new one |

---

## 9. Definition of done

- `apps/order-web/src/components/` does not exist.
- Every file under `apps/order-web/src/pages/` except `_app.tsx`, `_document.tsx` and `global.css` is
  an import line, a `getServerSideProps` re-export, and a default export.
- No file under `apps/order-web/src/pages/` imports `react`, `tamagui`, `next/router` or a relative
  path — enforced by lint, not convention.
- A QR scan to `/t/{code}` returns HTML containing the table name and the menu.
- `libs/ui/src/app/order/` holds the layouts, the loaders, the session helpers, the provider stack and
  the seven page entries; `TableLayout`, `OrderProviders`, `resolveSession`, `resolveTable` and
  `CookieSessionRepository` have tests.
- `nx run ui:test`, `npm run lint`, `nx run order-web:build`, `nx run pos-web:build` and
  `nx run order-web-e2e:e2e` are green.
- Every item in §6 verified by hand once, at P8.

---

## 10. Deliberately out of scope

- **Edge/ISR caching of the menu** (D15) — its own document, once SSR is bedded in.
- **Server-rendering the cart** (D5) — revisit only with caching decided; the two interact.
- **Adopting D7's "loaders live in libs" pattern for `apps/pos-web`.** If it proves out here, it
  removes 56 copies of the same auth-redirect block. Separate TRD, and the order app should carry the
  risk first.
- **Improving the `NaN` / unknown-id paths** (D17).
- **App Router / Server Components** (D1).
- **Splitting `libs/ui` into `libs/pos` and `libs/order`** — rejected with reasons in
  `docs/trd-ui-presentation-split-by-app.md` D8; nothing here changes that calculus.
- **Any change to `apps/pos-web` pages.** They are the reference, not the subject.

---

## References

- `docs/trd-order-app-nextjs-migration.md` — D2 (Vercel, not GitHub Pages), D4 (`getLayout` and mount
  preservation), D5/D5.1/D5.2 (the mount gate and `router.isReady`, both deleted here), D6/D20 (the
  `@gatherloop-pos/ui/order` entry point), D13 (the same-origin proxy, kept for the browser)
- `docs/trd-ui-presentation-split-by-app.md` — D5 (`app/` is its own layer), D6 (composition roots
  stay in `libs/ui`), D7 (layer-major), D10 (the lint guardrail pattern)
- `docs/prd-table-ordering.md` — D3 (the anonymous session), D17 (scan-the-QR fallback), D18
  (client-only, and why), D22 (the `X-Session-Id` header), FR-4 to FR-9
- `docs/prd-order-app-ux-improvements.md` — FR-9 (the cart item edit modal), the mobile-network
  posture §4 argues from
- `docs-site/public/screenshots/README.md` — the relative-base-URL trap, §2.4a
- `apps/pos-web/src/pages/products/index.tsx` and `products/[productId]/index.tsx` — the reference
  `getServerSideProps`
- `docs-site/under-the-hood/clean-architecture.md` — the four-layer description this makes true for
  the order app
