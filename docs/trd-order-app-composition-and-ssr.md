# TRD — Make `apps/order-web` look like `apps/pos-web`: composition in `libs`, rendered on the server

**Status:** proposed
**Scope:** `apps/order-web/src/**`, `libs/ui/src/app/order/**`, `libs/ui/src/presentation/screens/order/**`, `libs/ui/src/data/**`, `libs/ui/src/domain/{repositories,usecases}/**`, `libs/ui/src/utils/queryParam.ts`, `libs/ui/src/index.order.ts`, `libs/api-contract/src/client.ts`, the two `.eslintrc.json`, `apps/order-web/.env.example`, `apps/order-web-e2e/**`, Vercel env, `docs-site/under-the-hood/clean-architecture.md`
**Non-scope:** `apps/pos-web`, `apps/pos-mobile`, `apps/api`, `libs/provider`, App Router, the customer-facing UI itself — no screen, copy, layout or interaction changes (two **URLs** change; see D6)
**Date of research:** 2026-09-08 (every claim below was checked against the code at `b5696b3`)

---

## 1. Problem statement

`apps/pos-web` has no `src/components/`. A POS page file is a framework adapter and nothing else: a
`getServerSideProps` that reads the request and instantiates repositories, then
`export default <CompositionRoot>` — where the root comes from `@gatherloop-pos/ui/pos` and owns the
whole vertical slice. And `libs/ui/src/app/pos/` contains *only* those roots: 55 files named
`<Domain><Action>.tsx`, each one a function that news up repositories and usecases and returns one
Handler. No providers, no contexts, no hooks, no wrappers.

`apps/order-web` differs on two axes, and they are the same problem seen twice.

**It carries composition in the app.** `src/components/` holds three layout components
(`TableLayout`, `MenuLayout`, `CartLayout`, 99 lines) that compose library screens and read route
params. Its page files parse params by hand three times, declare a local `NextPage & { getLayout }`
type five times, and wire `getLayout` per page. `_app.tsx` owns an order-specific provider stack plus
a mount gate.

**It renders client-only.** Not by preference — it had to. It was a static bundle on GitHub Pages, so
there was no server to render on and no server to mint a session (D18/D19 in
`docs/prd-table-ordering.md`, D2 in the migration TRD). **That constraint expired when the app moved
to Vercel.** What is left of it is a mount gate that makes the server emit an empty shell, a
`router.isReady` gate that exists because `router.query` is empty until hydration, and a QR scan that
paints a skeleton where the POS would have painted data.

There is a third, quieter divergence that follows from the second. Because the order app had no
server, cross-screen state had to be hoisted into React context above the router — `SessionProvider`,
`CartProvider`, and `TableResolve` as a `children`-taking wrapper. `libs/ui/src/app/order/` therefore
holds eight files, only some of which are composition roots. The POS needs none of that machinery, and
§3 shows the order app does not either.

**This document converges all three**, in nine phases, each small, reviewable and independently
revertable. **It implements nothing.**

---

## 2. Current state audit

### 2.1 `apps/order-web/src`

| File | Lines | Fate |
|---|---|---|
| `components/TableLayout.tsx` | 42 | **deleted** (P5) |
| `components/MenuLayout.tsx` | 30 | **deleted** (P3) |
| `components/CartLayout.tsx` | 27 | **deleted** (P4) |
| `pages/_app.tsx` | 65 | mount gate, `getLayout` dispatch and both order providers deleted (P2, P5) |
| `pages/_document.tsx` | 55 | **stays** (framework shell) |
| `pages/index.tsx`, `pages/404.tsx` | 15 | → `TableScan` (P5) |
| `pages/t/[code]/index.tsx` | 14 | → `MenuList` + loader (P3, P6) |
| `pages/t/[code]/products/[productId].tsx` | 24 | **deleted** (P3) — becomes `?product=` (D6) |
| `pages/t/[code]/cart/index.tsx` | 14 | → `Cart` + loader (P4, P6) |
| `pages/t/[code]/cart/items/[cartItemId].tsx` | 24 | **deleted** (P4) — becomes `?item=` (D6) |
| `pages/t/[code]/checkout.tsx` | 24 | → `Checkout` + loader (P5, P6) |
| `pages/global.css` | — | **stays** |

### 2.2 `libs/ui/src/app/order` today, against `app/pos`

`app/pos/` is 55 composition roots and an `index.ts`. `app/order/` is eight files of three different
kinds:

| File | Kind | POS has an equivalent? |
|---|---|---|
| `MenuList.tsx`, `Cart.tsx`, `Checkout.tsx` | composition root | yes — this is the whole of `app/pos` |
| `MenuItemDetail.tsx`, `CartItemEdit.tsx` | composition root for an **overlay** of another screen | no — POS wires a sub-usecase into the parent screen's root (§2.3) |
| `TableResolve.tsx` | a `children`-taking **wrapper** that resolves the table and renders the cart bar | no — a POS screen renders its own `Layout` (§2.3) |
| `SessionProvider.tsx`, `CartProvider.tsx` | React **context** holding app-wide state | no — a POS root news up what its screen needs (§2.3) |

### 2.3 The three POS patterns that replace them

**(a) One root wires several usecases into one Handler.** `app/pos/ProductList.tsx` news up three
usecases — `productListUsecase`, `productDeleteUsecase`, `authLogoutUsecase` — and hands all three to
`ProductListHandler`, which runs three controllers and coordinates them with an effect. The delete
confirmation is not a separate route, root or context; it is a second usecase on the same screen, and
`ProductListScreen` renders `ProductDeleteAlert` as a child.

That is the shape `MenuItemDetail` and `CartItemEdit` should take: sub-usecases of their parent
screen, not roots of their own.

**(b) The screen renders its own shell.** `ProductListScreen` imports `Layout` from
`../../components` and renders it. There is no wrapper root that takes `children`. `TableResolve`
should be the same: `MenuListScreen` renders the table shell, and `tableResolveUsecase` is one more
usecase on `MenuListHandler`.

**(c) Query params are a repository, and it already works on both sides of the render.** POS reads
list state — page, search, sort, filters — through `Url<X>QueryRepository` in `data/url/`,
implementing a port in `domain/repositories/`, injected into the usecase:

```ts
const productListUsecase = new ProductListUsecase(
  productRepository, productListQueryRepository, productListParams
);
```

It is built on `getQueryParam(key, url?)` / `setQueryParam(key, value)` in `libs/ui/src/utils/`.
`getQueryParam` reads `new URL(url).searchParams` when `window` is undefined and
`window.location.href` when it is defined — so **the same repository serves `getServerSideProps` (fed
by `getUrlFromCtx(ctx)`) and the browser**, with no readiness problem, because `window.location` is
correct from the first client render where `router.query` is not. `setQueryParam` writes the URL via
`Router.replace(…, { shallow: true })`.

That is the mechanism for `?product` and `?item` — no hook, no `next` import in a composition root.

**(d) There is no cross-screen React context in the POS**, and `libs/provider`'s `RootProvider`
already carries the app-agnostic ones (`QueryClientProvider`, `TamaguiProvider`, `ToastProvider`,
`ConfirmationAlertProvider`). `ConfirmationAlertProvider` lives in
`presentation/components/base/ConfirmationAlert/`, not in `app/` — the precedent for where a context
belongs if one is ever genuinely needed.

### 2.4 The seeding contract mostly exists

Three of the four order usecases already accept SSR seed params and start loaded when given them:

| Usecase | Params | `getInitialState()` when seeded | Needs work? |
|---|---|---|---|
| `MenuListUsecase` | `{ products, categories, variants? }` | `products.length >= 1 ? 'loaded' : 'idle'` | gains the query-repository port (D6) |
| `MenuItemDetailUsecase` | `{ productId, product? }` | `'selectingOptions'`, not `'idle'` | gains a `SELECT_PRODUCT` action (D6) |
| `CartUsecase` | `{ cart? }` | `cart ? 'loaded' : 'idle'` | no (seed unused — D5) |
| `TableResolveUsecase` | `{ code }` | `'noCode'`, or `'idle'` → resolves | **yes** — gains `table?: PublicTable \| null` → `'resolved'` |

`useController` reads `getInitialState()` once into `useReducer`'s initial value, so a seeded usecase
hydrates loaded and never fires its mount fetch — how `ProductListUsecase` works today.

`Product` carries `options` as a **required** field (`libs/api-contract/src/api.yaml`) and
`publicProductList` returns full `Product`s, so the menu payload already contains everything the item
sheet needs to render. That is what makes D6 possible.

### 2.5 What blocks SSR

**(a) The API base URL is relative, and Node cannot resolve it.** `libs/api-contract/src/client.ts`
sets `baseURL: process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL']`, and
`apps/order-web/.env.example` sets that to `/api`. A browser resolves `/api`; Node does not, so the
first `getServerSideProps` that touches a repository throws. Already documented as a trap in
`docs-site/public/screenshots/README.md`:

> `NEXT_PUBLIC_API_PROXY_BASE_URL` … must be an **absolute** URL … every list page 500s.

The POS works around it by setting the var to an absolute URL (`http://localhost:3000/api`), so every
POS server-side request hairpins out of Node, back into the same deployment, through `rewrites()`,
then to the API. Not the fix to copy. See D2.

**(b) The session is minted in the browser, during render.** `BrowserSessionRepository`'s constructor
reads and writes `document.cookie`, touches `window.localStorage` and calls `crypto.randomUUID()`, and
`SessionProvider` constructs it inside `useState(() => …)`, which runs on the server too. That is the
entire reason `_app.tsx` gates the tree on `mounted`.

A quieter hazard sits in the same place: `CartUsecase` auto-fetches from `idle`, and
`useCartController`'s effect runs **before** `SessionProvider`'s (React runs child effects before
parent effects), so the `X-Session-Id` interceptor is registered after the cart controller first
fires. It works only because the cart machine takes two effect passes to reach a network call.
Nothing states that invariant and nothing tests it. D3 removes both the gate and the hazard.

**(c) Nothing else.** With D6 collapsing the overlay routes and (b) above removing the wrapper, every
screen a route renders is owned by that route's own composition root.

---

## 3. Target architecture

### 3.1 The rules

> 1. An `apps/order-web` page file contains a `getServerSideProps` and a default export, and no JSX.
> 2. `libs/ui/src/app/order/` contains **only composition roots** — one file per screen, each a
>    function that news up repositories and usecases and returns one Handler. Same as `app/pos/`.
> 3. `libs/ui` imports nothing from `next` outside `utils/` (§10).

Everything that is not a composition root moves to the layer that owns it: query-param reading to
`data/url/`, the session to `data/session/`, shell and overlay rendering to
`presentation/screens/order/`.

### 3.2 Target tree

```
libs/ui/src/app/order/            ← four roots and an index, nothing else
├── MenuList.tsx                  # tableResolve + menuList + menuItemDetail + cart usecases
├── Cart.tsx                      # tableResolve + cart + (item edit is cart state)
├── Checkout.tsx                  # tableResolve + checkout
├── TableScan.tsx                 # tableResolve with code = null  (`/` and `404`)
└── index.ts

libs/ui/src/data/session/
├── constants.ts                  # cookie/storage keys, max-age, the UUIDv4 pattern
├── resolveSession.ts             # pure: (cookieValue?) => { sessionId, setCookie? }
└── CookieSessionRepository.ts    # constructed with an id; reconciles the mirror lazily (D4)

libs/ui/src/data/url/
└── menuListQuery.ts              # ?product / ?item, alongside the ten POS query repositories

libs/ui/src/domain/repositories/
└── menuListQuery.ts              # the port
```

**Deleted:** `app/order/{TableResolve,MenuItemDetail,CartItemEdit,SessionProvider,CartProvider}.tsx`,
`data/browser/{session,sessionInterceptor}.ts`, and all of `apps/order-web/src/components/`.

```
apps/order-web/src/
├── pages/…                       # five route files: a loader and a default export
└── pages/{_app,_document}.tsx    # framework shell only
```

### 3.3 The routes

| Path | Root | Loader fetches |
|---|---|---|
| `/` and `404` | `TableScan` | — |
| `/t/{code}` (`?product={id}` opens the sheet) | `MenuList` | session, table, menu |
| `/t/{code}/cart` (`?item={id}` opens the modal) | `Cart` | session, table |
| `/t/{code}/checkout` | `Checkout` | session, table |

### 3.4 A page, in full

```tsx
// apps/order-web/src/pages/t/[code]/index.tsx — the whole file
import {
  ApiMenuRepository, ApiPublicTableRepository, getUrlFromCtx,
  resolveSession, SESSION_ID_COOKIE_NAME, UrlMenuListQueryRepository,
} from '@gatherloop-pos/ui';
import { MenuList, MenuListProps } from '@gatherloop-pos/ui/order';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<MenuListProps> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(ctx.req.cookies[SESSION_ID_COOKIE_NAME]);
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const client = new QueryClient();
  const code = String(ctx.params?.code ?? '');
  const url = getUrlFromCtx(ctx);

  const table = await new ApiPublicTableRepository().resolveTableByCode(code);
  const { products, categories, variants } = await new ApiMenuRepository(client).fetchMenu({ query: '' });
  const selectedProductId = new UrlMenuListQueryRepository().getSelectedProductId(url);

  return {
    props: {
      sessionId,
      tableResolveParams: { code, table },
      menuListParams: { products, categories, variants, selectedProductId },
    },
  };
};

export default MenuList;
```

The `<usecase>Params` prop shape is the POS's — compare
`apps/pos-web/src/pages/products/index.tsx`, which returns `{ productListParams: {…} }`.

### 3.5 A composition root, in full

```tsx
// libs/ui/src/app/order/MenuList.tsx
export type MenuListProps = {
  sessionId: string;
  tableResolveParams: TableResolveParams;
  menuListParams: MenuListParams;
};

export function MenuList({ sessionId, tableResolveParams, menuListParams }: MenuListProps) {
  const client = new QueryClient();
  const sessionRepository = new CookieSessionRepository(sessionId);
  const menuRepository = new ApiMenuRepository(client);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const menuListQueryRepository = new UrlMenuListQueryRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, tableResolveParams);
  const menuListUsecase = new MenuListUsecase(menuRepository, menuListQueryRepository, menuListParams);
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: menuListParams.selectedProductId,
  });
  const cartUsecase = new CartUsecase(cartRepository);

  return (
    <MenuListHandler
      tableResolveUsecase={tableResolveUsecase}
      menuListUsecase={menuListUsecase}
      menuItemDetailUsecase={menuItemDetailUsecase}
      cartUsecase={cartUsecase}
      sessionRepository={sessionRepository}
    />
  );
}
```

Structurally identical to `app/pos/ProductList.tsx`: repositories, usecases, one Handler.
`MenuListHandler` runs four controllers and coordinates them the way `ProductListHandler` runs three
(§2.3a); `MenuListScreen` renders the table shell, the list, and `MenuItemDetailScreen` as a child,
the way `ProductListScreen` renders `Layout`, the list and `ProductDeleteAlert`.

### 3.6 `_app.tsx` after P5

```tsx
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>{/* unchanged */}</Head>
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <Component {...pageProps} />
      </RootProvider>
    </>
  );
}
```

`apps/pos-web/src/pages/_app.tsx` minus the theme provider. Gone: the `mounted` state and its effect,
the `getLayout` dispatch, the local `OrderPage` type, and both order providers.

### 3.7 `libs/ui/src/index.order.ts` after P8

Keeps what `libs/provider` and the shell need (`config` — `tamaguiConfig` and
`ConfirmationAlertProvider` are imported by `libs/provider/src/provider.tsx` — plus `LoadingView`,
`OrderLayout`, `MenuItemThumbnail`, `currency`) and exports the four roots and their prop types.
`resolveSession`, the session constants, `UrlMenuListQueryRepository` and the API repositories come
from the root barrel `@gatherloop-pos/ui`, which the loaders import — the barrel is POS-free as of
`b5696b3` (`index.ts` exports `config`, `data`, `domain`, `utils`, not `./app`), so this costs the
customer bundle nothing. The migration TRD's D20 warning about that barrel is stale.

---

## 4. What this costs

**Navigating between the three page-level routes gains a server round trip**, because
`getServerSideProps` runs before the next route renders. Menu → cart, cart → checkout and Back now
wait on a session-and-table payload (no menu, no cart — small, but a round trip).

**Opening the item sheet or the cart-item modal does not**: D6 makes those the same route, and
`setQueryParam` writes the URL shallowly. They get *faster* than today — the sheet renders from the
menu payload the server already sent, with no fetch, where today it mounts a skeleton and fetches.

**The cart is fetched once per page-level navigation instead of once per visit.** `CartProvider`
holds one machine above the router today; per §2.3d each root news up its own. That is one small GET
on each of menu → cart → checkout, against one for the whole visit. It is what every POS page does,
the cart is server-authoritative so instances cannot diverge, and the navigation already costs a
round trip. Accepted.

What the change buys:

| Win | Size |
|---|---|
| A QR scan paints the real menu instead of a skeleton — one round trip instead of three sequential ones (HTML → JS → table resolve → menu fetch) | **Large.** The app's entry path; every guest pays it once |
| The item sheet opens with no network call at all (§2.4) | Medium — and it is the most-used interaction |
| No "Memuat meja…" gate, no `router.isReady` flash, no empty server shell | Medium |
| The mount gate, the readiness gate and the interceptor-ordering hazard all disappear | Medium |
| `app/order/` becomes `app/pos/`: roots only, no contexts, no wrappers, no hooks | The stated goal |

---

## 5. Decisions

### D1 — `getServerSideProps`, Pages Router, no App Router

The POS is Pages Router and convergence is the point. Server Components would let a layout fetch its
own data — the strongest argument for App Router anyone in this repo has — and are also a rewrite of
both frontends' routing. Not now. `getStaticProps` + ISR is tempting for the menu but the table code
is a param with an unbounded value space and the catalog changes whenever staff edit a product (D12).

### D2 — `client.ts` resolves the base URL per execution environment

```ts
const serverBaseUrl =
  process.env['API_INTERNAL_BASE_URL'] ?? process.env['NEXT_PUBLIC_API_BASE_URL'];
const browserBaseUrl =
  process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'];

export const axiosInstance = axios.create({
  baseURL: typeof window === 'undefined' ? serverBaseUrl ?? browserBaseUrl : browserBaseUrl,
});
```

The server calls the API origin directly; the browser keeps calling `/api`, so D13's proxy keeps
doing its job (no CORS, no preflight) unchanged. The `?? browserBaseUrl` tail is what makes this safe
for `apps/pos-web` and `apps/pos-mobile`: with neither server var set, every consumer resolves
byte-identically to today. React Native has no `window`, so the fallback also keeps Metro on the
browser branch.

### D3 — The session is a repository, not a provider

`resolveSession(cookieValue?: string)` is a pure function in `data/session/`: it validates against the
UUIDv4 pattern `BrowserSessionRepository` uses today and, when the value is missing or malformed,
mints one and returns a `Set-Cookie` string with the same `Max-Age`/`Path`/`SameSite`/`Secure`
attributes. It takes and returns strings, so it carries no `next` dependency and is trivially
testable.

`CookieSessionRepository` is constructed with that id by each composition root — no context, no
`useSessionRepository`. **`ApiCartRepository` takes it as a constructor dependency** and sets
`X-Session-Id` per request through the `options` parameter P1 adds, which deletes
`data/browser/sessionInterceptor.ts` and, with it, the effect-ordering hazard in §2.5b: there is no
global interceptor to register before the first request, because the header travels with the call
that needs it. `withCredentials: false` (D22 in `docs/prd-table-ordering.md`) moves into the same
per-request options, on the three order repositories only, instead of a global axios default.

Server and client derive the same id from the same cookie, so there is no hydration mismatch and no
mount gate.

The cookie stays readable from JavaScript (not `HttpOnly`) — D4 needs it.

### D4 — The localStorage mirror still wins, and reconciles inside the repository

Safari's ITP evicts the cookie; the localStorage mirror is what survives, and re-promoting it is what
keeps a guest's cart across that eviction. But the server, seeing no cookie, will have minted a new
id for that request.

`CookieSessionRepository.getSessionId()` therefore reconciles on its first client-side call: if
localStorage holds a valid id that differs from the constructor's, that one wins, is re-promoted to
the cookie, and is returned. `getSessionId()` is called by `ApiCartRepository` when it builds a
request — never during render — so the side effect is legal there, and it needs no effect, no
provider and no lifecycle. Cost: one wasted server-side mint per eviction. This is a deliberate
exception to "repositories don't mutate on read", and the reason is written in the file.

### D5 — The cart is **not** server-rendered

It is per-session, so an SSR'd cart makes every response private and uncacheable. The floating bar
popping in a beat after paint is what happens today, so this is parity. `CartParams.cart` stays in the
domain layer, unused, for when D12 revisits it. This also keeps the catalog routes' HTML identical
for every guest, which is what makes the caching follow-up possible at all.

### D6 — The item sheet and the cart-item modal are query params read through a repository

`/t/{code}/products/{id}` becomes `/t/{code}?product={id}`; `/t/{code}/cart/items/{id}` becomes
`/t/{code}/cart?item={id}`. They are read and written by `UrlMenuListQueryRepository`
(`data/url/menuListQuery.ts`, implementing a port in `domain/repositories/`), injected into
`MenuListUsecase` and `CartUsecase` exactly as `UrlProductListQueryRepository` is injected into
`ProductListUsecase` (§2.3c). The selected id becomes part of the usecase's state, moved by
`SELECT_ITEM`/`CLEAR_ITEM` actions — a state machine transition, not a hook.

This is the decision that removes the most machinery. Because the overlay and its parent are one
route rendered by one screen:

- **`getLayout` is deleted.** It existed only so `MenuList` (resp. `Cart`) kept its position in the
  tree across a route change. There is no route change any more.
- **The mount-preservation risk is gone**, not mitigated — the menu's scroll position, search text and
  category filter cannot be lost to a remount that cannot happen. This was the plan's largest
  untested risk.
- **The sheet opens with no network call**, because `Product.options` is required on the menu payload.
- **Two page files and two composition roots disappear**, along with the last hand-rolled
  `Number(router.query.x)` parses.
- **No `next` import reaches `app/order/`**: `getQueryParam` already spans server and browser (§2.3c).

Two mechanical changes it needs:

1. `setQueryParam` uses `Router.replace(…, { shallow: true })`, which leaves no history entry, so Back
   would not dismiss the sheet (D19 in `docs/prd-table-ordering.md`). It gains an optional
   `{ history: 'push' | 'replace' }`, defaulting to `'replace'` so POS behaviour is untouched.
2. `MenuItemDetailUsecase` takes `productId` at construction. One instance must serve successive
   selections, so it gains a `SELECT_PRODUCT` action — the same shape `ProductDeleteUsecase` uses to
   receive the product it is asked to delete.

What it costs: two user-facing URLs change, contradicting the route table in
`docs/prd-table-ordering.md` §2.2, and the deep-link assertions in the e2e spec change with them.
Printed QR codes are unaffected — `getTableOrderUrl()` encodes only `/t/{code}`. No redirect from the
old paths is proposed: they were never printed, never shared outside the app, and `404.tsx` already
lands unmatched paths on the scan-the-QR screen. Redirects in `next.config.js` are three lines if
that proves wrong.

### D7 — Loaders live in the pages, like the POS

An earlier draft put them in `libs` to avoid repeating a preamble, since `apps/pos-web` repeats its
auth check in 56 files. Rejected: the order app has five route files; `getServerSideProps` is
framework glue and belongs with `_document.tsx` on the Next side; and `libs/ui` is Metro-bundled for
`apps/pos-mobile`, where server-only code has no business being reachable even accidentally. Shared
logic still lives in the library — as pure functions and repositories over primitives, not over
`GetServerSidePropsContext`.

### D8 — No React context in `app/order/`

`SessionProvider` and `CartProvider` exist because a client-only app with no server had nowhere else
to hoist app-wide state. D3 replaces the first with a repository; §2.3d replaces the second with
per-root construction, which is what all 55 POS roots do. `_app.tsx` is left with `RootProvider`
alone (§3.6).

If a genuinely app-wide context is ever needed again, its home is
`presentation/components/base/<Name>/`, next to `ConfirmationAlertProvider`, and it is composed into
`libs/provider`'s `RootProvider` — not `app/`.

### D9 — Overlays are sub-usecases of their parent screen, and shells are rendered by screens

`MenuItemDetail` and `CartItemEdit` stop being composition roots; their usecases are wired by the
parent root and their screens are rendered as children by the parent screen (§2.3a).
`TableResolve` stops being a `children`-taking wrapper; `tableResolveUsecase` becomes one more usecase
on each Handler and the shell is rendered by each Screen (§2.3b).

The cost is real and lands in `presentation/screens/order/`: `MenuListHandler` grows from one
controller to four, and `MenuListScreen` grows to render the shell, the list and the sheet. That is
the same size and shape as `ProductListHandler` (three controllers, coordinated by an effect) and
`ProductListScreen` (`Layout` + list + `ProductDeleteAlert`), which are the files this is converging
on.

### D10 — `TableScan` serves `/` and `404`, and needs no session

Both render the scan-the-QR screen today, documented as the same outcome (D17 in
`docs/prd-table-ordering.md`). Next does not run `getServerSideProps` for the built-in 404 page — and
does not have to: with no table there is no cart, so `TableScan` needs no session id, and there is no
client-minting path left anywhere in the app.

### D11 — Behaviour is preserved, including the parts that look like bugs

A `?product=` pointing at nothing yields the sheet's existing error state, as a garbage `productId`
does today. The loader could return `notFound: true` instead; it does not. If that deserves
improving, it is a separate PR with its own test.

### D12 — No CDN caching in this document

`Cache-Control: private, no-store`, Next's default. Edge-caching the menu route is a real opportunity
— D5 keeps the HTML guest-independent precisely so it stays available — but it interacts with the
`Set-Cookie` on a first visit and with staff catalog edits, and it deserves its own document.

### D13 — Lint rules keep both boundaries

`apps/order-web/.eslintrc.json`, for `src/pages/**` excluding `_app.tsx`/`_document.tsx`:

```json
{
  "no-restricted-imports": ["error", { "patterns": [{
    "group": ["react", "tamagui", "next/router", "./*", "../*"],
    "message": "An order page is a getServerSideProps and a default export. See docs/trd-order-app-composition-and-ssr.md."
  }]}]
}
```

`next` and `@gatherloop-pos/ui` stay allowed — the loader needs `GetServerSideProps` and the
repositories. Banning relative imports forbids a new `src/components/`; banning `react`/`tamagui`
forbids JSX creeping back in.

`libs/ui/.eslintrc.json` gains two: `next` and `next/router` are restricted under `src/app/**` and
`src/presentation/**` (Metro bundles both for `apps/pos-mobile`, and after this work no composition
root needs them); and `react` is restricted under `src/app/order/**`, which is what stops a hook or a
context reappearing there. `src/utils/{queryParam,url}.ts` are outside every glob and unaffected
(§10).

### D14 — The four roots get no stories

They new up repositories and return a Handler; there is nothing to look at. The screens underneath
are already storied and stay so. `resolveSession`, `CookieSessionRepository`,
`UrlMenuListQueryRepository` and the changed usecases get jest tests.

---

## 6. Parity contract

1. Every screen in §3.3 is reachable at its listed URL, including a hard navigation / refresh / QR
   scan. The two overlay URLs change, by D6; nothing else does.
2. **Opening an item sheet does not remount the menu**: scroll position, search text and selected
   category survive open → close, by both the close button and browser Back. Same for the cart and its
   edit modal. (Menu state across menu → cart → menu is not preserved today either — `MenuList`
   unmounts with `MenuLayout` — and this does not change that.)
3. The table resolves once per page load, and moving menu → cart → checkout shows no "Memuat meja…".
4. No scan-the-QR or "QR tidak valid" flash before the real screen on a deep link, and no sheet
   popping in after hydration on a `?product=` deep link.
5. The cart survives navigation and a full page reload, **including across cookie eviction with an
   intact localStorage mirror** (D4). Checked explicitly in P2.
6. The anonymous session id is stable across reloads, and `X-Session-Id` is on every `/carts/*`
   request and on nothing else.
7. Copy stays Bahasa Indonesia; the shell stays a phone-width column pinned to `100dvh` with the
   footer above the iOS home indicator.
8. Existing printed QR codes keep working.
9. `apps/pos-web`, `apps/pos-mobile`, Storybook and every existing `libs/ui` test keep passing.
10. **No hydration mismatch warnings** on any route, in development or production.

---

## 7. Phase plan

P1 and P2 change no rendering; the first user-visible change is P3. P3–P5 are composition moves with
no data seeding — SSR seeding lands in P6, once the structure is settled.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P1 | `fix(api-contract): resolve the API base URL per environment` | — | S |
| P2 | `refactor(ui): make the order session a repository` | P1 | M |
| P3 | `refactor(ui): compose the menu screen the way the POS does` | P2 | L |
| P4 | `refactor(ui): compose the cart screen the way the POS does` | P3 | M |
| P5 | `refactor(ui): compose checkout and the scan-QR screen` | P4 | M |
| P6 | `feat(order-web): server-render the table and the menu` | P5 | M |
| P7 | `test(order-web-e2e): follow the overlay URL change` | P6 | S |
| P8 | `chore(order-web): keep order pages and app/order thin` | P7 | S |
| P9 | `docs: refresh the order app architecture notes` | P8 | S |

### P1 — Base URL, and the repository `options` parameter

**Touches** `libs/api-contract/src/client.ts` (D2); `libs/ui/src/data/api/{menu,publicTable,cart}.ts`
and their domain interfaces — each method gains `options?: Partial<RequestConfig>` forwarded to the
kubb client, exactly as `ApiProductRepository.fetchProductById(productId, options?)` already does;
`apps/order-web/.env.example` (document `API_INTERNAL_BASE_URL`).

No component changes, no rendering changes. It stands alone because it is the one phase that can
silently break `apps/pos-web` and `apps/pos-mobile`.

**Verify:** `nx run ui:test`; `nx run pos-web:build` and a POS list page renders server-side against a
local API (proves the fallback branch); `nx run order-web-e2e:e2e` green; **a scratch
`getServerSideProps` in the order app calling `ApiPublicTableRepository` returns data instead of
throwing on a relative URL** — the phase's real acceptance test. Delete the scratch page before
merging.

### P2 — The session becomes a repository

**Adds** `libs/ui/src/data/session/{constants,resolveSession,CookieSessionRepository}.ts` + tests.
**Touches** `ApiCartRepository` (takes a `SessionRepository`, sets `X-Session-Id` and
`withCredentials: false` per request); `ApiMenuRepository`/`ApiPublicTableRepository`
(`withCredentials: false` per request); `CartProvider` and `TableResolve` (take a `sessionId` prop
threaded from `_app.tsx` — temporary scaffolding, removed by P5); every page file gains a
`getServerSideProps` that resolves the session and nothing else; `_app.tsx` loses the mount gate.
**Deletes** `data/browser/{session,sessionInterceptor}.ts`.

The server now renders the real tree instead of `null`. Nothing else is seeded, so every screen still
starts `idle` and fetches on mount — first paint gains the shell and the skeletons, not the data.
That is deliberate: **this phase's risk is hydration, and it is much easier to diagnose with one
variable changed.**

**Verify:** `nx run ui:test`; `nx run order-web:build && nx run order-web:start` — view source on
`/t/{code}` shows the shell in the HTML with **no hydration warning** (parity item 10). The session
cookie survives a reload; deleting the cookie while keeping `localStorage.gl_session_id` restores the
same cart (parity item 5, D4); `X-Session-Id` is on every `/carts/*` request and on nothing else.
`nx run order-web-e2e:e2e` green.

**If hydration cannot be made clean here, stop and take §7.1's fallback** — do not start P3.

### P3 — The menu screen

The largest phase: it folds a wrapper, an overlay root and a route into one screen.

**Touches** `MenuListUsecase` (takes `MenuListQueryRepository`, holds `selectedProductId`, gains
`SELECT_ITEM`/`CLEAR_ITEM`); `MenuItemDetailUsecase` (gains `SELECT_PRODUCT`, D6);
`setQueryParam` (the `history` option, D6); `MenuListHandler` (four controllers, §2.3a);
`MenuListScreen` (renders the shell, the list and `MenuItemDetailScreen`); `app/order/MenuList.tsx`
(§3.5).
**Adds** `domain/repositories/menuListQuery.ts`, `data/url/menuListQuery.ts` + tests.
**Deletes** `app/order/MenuItemDetail.tsx`, `apps/order-web/src/pages/t/[code]/products/[productId].tsx`,
`apps/order-web/src/components/MenuLayout.tsx`.

`CartProvider` is still mounted in `_app.tsx` for the not-yet-migrated routes while `MenuList` news up
its own `CartUsecase`, so the menu route issues one redundant cart GET until P5 deletes the provider.
Noted in the PR description; it costs a request, not correctness — the cart is server-authoritative.

**Verify:** **parity item 2, the blocking check** — scroll the menu, type a search term, pick a
category, open an item, close it with both the close button and browser Back: scroll, search and
category all survive and the Network tab shows **no request at all** on open or close. Deep-link
`/t/{code}?product={id}` opens the sheet over the menu. `nx run ui:test` — the order handler tests
change with the handlers.

### P4 — The cart screen

**Touches** `CartUsecase` (takes the query repository, holds the selected item id); `CartHandler`,
`CartScreen` (renders the shell, the cart and `CartItemEditScreen`); `app/order/Cart.tsx`.
**Deletes** `app/order/CartItemEdit.tsx` (and `CartItemEdit.test.tsx` moves to the handler),
`apps/order-web/src/pages/t/[code]/cart/items/[cartItemId].tsx`,
`apps/order-web/src/components/CartLayout.tsx`.

**Verify:** add to cart → the bar appears → the cart lists the line → open the edit modal (the cart
stays visible behind it, no request) → change amount and note → save → remove → clear-all. Back
dismisses the modal without leaving the cart. Reload `/t/{code}/cart?item={id}` and the modal is open
over the restored cart.

### P5 — Checkout, scan-QR, and the last of the providers

**Touches** `CheckoutHandler`/`CheckoutScreen` and a new `TableScanScreen` to render the shell;
`app/order/{Checkout,TableScan}.tsx`; `_app.tsx` reaches §3.6.
**Deletes** `app/order/{TableResolve,SessionProvider,CartProvider}.tsx`,
`apps/order-web/src/components/TableLayout.tsx` — emptying `src/components/` — and the temporary
`sessionId` threading from P2.

After this phase `app/order/` is four roots and an index, and every route file is a loader and a
default export.

**Verify:** `/`, an unknown path and `/t/{code}/checkout` render as before; menu → cart → checkout
shows no "Memuat meja…" (parity item 3); exactly one cart GET per page load.

### P6 — Server-render the table and the menu

**Touches** `TableResolveUsecase` (the `table?` param and the `'resolved'` initial state, §2.4) + its
tests; the five loaders, which now fetch the table and the menu and seed `<usecase>Params` (§3.4).

The phase the customer feels: a QR scan paints the menu, not a skeleton.

**Verify:** view source on `/t/{code}` contains the table name and product names; on
`/t/{code}?product={id}` it contains the sheet, with no post-hydration pop (parity item 4). Record
before/after Largest Contentful Paint on a throttled connection and the transferred-bytes delta — the
menu now appears twice, as SSR markup and `__NEXT_DATA__`. Re-run parity item 2's check: seeded state
is read only on first mount, so a remount would now also re-seed.

### P7 — e2e

**Touches** `apps/order-web-e2e/src/table-ordering.spec.ts` — the deep-link assertions move to the
`?product=` URL, and the tap-to-open assertions gain a check that **no** request is issued;
`playwright.config.ts`'s `webServer.env`, which sets `NEXT_PUBLIC_API_PROXY_BASE_URL: '/api'` with no
server-side var and needs one.

The suite runs unchanged through P1–P6 except for the two overlay URLs; this is a separate phase so a
spec change never hides a behaviour change.

**Verify:** `nx run order-web-e2e:e2e` green from a fresh checkout with only `.env.example`'s
variables set.

### P8 — Guardrails and barrel

**Touches** both `.eslintrc.json` (D13); `index.order.ts` (§3.7).

**Verify:** `npm run lint`; a scratch page importing `tamagui` fails lint, and a scratch
`app/order/useSomething.ts` importing `react` fails lint; delete both. First Load JS for `/t/[code]`
unchanged from P6's recorded number.

### P9 — Environment and documentation

**Touches** `apps/order-web/.env.example` and the Vercel env (`API_INTERNAL_BASE_URL`);
`docs-site/under-the-hood/clean-architecture.md`; `docs/prd-table-ordering.md` §2.2's route table and
`docs/trd-order-app-nextjs-migration.md` §2.2/§2.3/§5.1/§5.4 and D4/D5 — annotate as superseded here
rather than rewriting history.

**Verify:** docs-site builds; a Vercel preview deploy serves a real QR-scan path end to end.

### 7.1 If hydration cannot be made clean (the fallback)

P2 is the risk probe. If the Tamagui/react-native-web tree cannot be server-rendered without
mismatches, most of this plan still stands: keep `_app.tsx`'s mount gate, skip P6, and run P3–P5 as
composition-only work. The session still resolves server-side (that works whether or not the tree
renders), the query repositories still drive the overlays, and `app/order/` still ends as four roots.
The end state is §3.1 minus SSR — the whole of the original "no logic in `apps/`, roots only in
`app/order`" goal, and where the POS's own pages were before they had `getServerSideProps`.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Hydration mismatch from `react-native-web`/Tamagui**, which the mount gate has hidden since the migration ("the server emits an empty shell — there is nothing to mismatch") | **Medium, and the one to watch** | P2 surfaces it with one variable changed and nothing seeded. `apps/pos-web` server-renders the same stack on 56 pages, which is strong evidence — but the order app's components are not the POS's. §7.1 is the pre-agreed fallback |
| **P3 is a big diff** — a usecase, two handlers, two screens and a root move together, and the order handler tests move with them | Medium | It is one screen's worth of change and it is the phase that pays for D6 and D9 at once. P4 repeats the identical shape on a smaller screen, so review effort front-loads. Splitting it further would ship a half-folded screen |
| P1 changes the base URL for `apps/pos-web`/`apps/pos-mobile` and breaks them | Low, **very** high impact | The `?? browserBaseUrl` fallback means "no server var set" resolves byte-identically to today. P1 is standalone and its acceptance test is a POS page rendering server-side |
| `setQueryParam`'s new `history` option changes POS behaviour | Low | It defaults to `'replace'`, today's behaviour; only the order query repository passes `'push'`. Covered by the existing POS list tests |
| **Shallow routing does not behave as expected** — Back does not dismiss, or the URL and state drift | Low, high impact | P3's manual checks cover both directions explicitly, and it is the first phase to use `push`. Fallback: keep the selection in usecase state only and push a history entry directly — the URLs and the structure stay as designed |
| Someone has bookmarked or shared `/t/{code}/products/{id}` | Low | Never printed (`getTableOrderUrl` encodes only `/t/{code}`), never linked outside the app; `404.tsx` already lands unmatched paths on the scan-the-QR screen. Redirects are three lines (D6) |
| A guest's cart appears empty after Safari evicts the cookie | Low, high impact | D4's rule, tested in P2 |
| Menu → cart → checkout feels slower, and each now refetches the cart | Medium, low impact | The payload is a session id and one table; the cart GET is small and server-authoritative (§4). Measured in P5/P6. `nextjs-progressbar` is already wired in the POS if a progress indicator is wanted |
| The menu payload inflates the HTML — every product, category and variant inlined twice | Medium | P6 records the transferred-bytes delta alongside LCP. If JSON dominates, trim what the loader passes; do not abandon SSR |
| `next/router` reaches the Metro bundle for `apps/pos-mobile` via `utils/queryParam.ts` | **None — already the case** | `queryParam.ts` imports `next/router` today and branches on `Platform.OS`; `apps/pos-mobile` already ships it. D6 adds no new import, only an option |

---

## 9. Definition of done

- `libs/ui/src/app/order/` contains four composition roots and an `index.ts`, and nothing else — no
  provider, no context, no hook, no wrapper. It imports neither `next` nor `react`.
- `apps/order-web/src/components/` does not exist, and no file under `apps/order-web/src/pages/`
  contains JSX except `_app.tsx` and `_document.tsx`.
- Every route file is a `getServerSideProps` and a default export — enforced by lint.
- `apps/order-web/src/pages/_app.tsx` differs from `apps/pos-web`'s only in the theme provider and the
  page title.
- A QR scan to `/t/{code}` returns HTML containing the table name and the menu; tapping an item issues
  no network request.
- `nx run ui:test`, `npm run lint`, `nx run order-web:build`, `nx run pos-web:build` and
  `nx run order-web-e2e:e2e` are green.
- Every item in §6 verified by hand once, at P8.

---

## 10. Deliberately out of scope

- **`libs/ui/src/utils/{url,queryParam}.ts`**, which import `next` and `next/router` and are used by
  POS pages and every POS list usecase. §3.1's rule stops at `utils/` deliberately: these are the
  shared cross-platform primitives the POS already depends on, and bringing them under the rule means
  touching POS code.
- **Edge/ISR caching of the menu** (D12) — its own document, once SSR is bedded in.
- **Server-rendering the cart** (D5) — revisit only with caching decided; the two interact.
- **Improving the unknown-id paths** (D11).
- **App Router / Server Components** (D1).
- **Splitting `libs/ui` into `libs/pos` and `libs/order`** — rejected in
  `docs/trd-ui-presentation-split-by-app.md` D8; nothing here changes that calculus.
- **Any change to `apps/pos-web` pages.** They are the reference, not the subject.

---

## References

- `apps/pos-web/src/pages/products/index.tsx`, `libs/ui/src/app/pos/ProductList.tsx`,
  `libs/ui/src/presentation/screens/pos/ProductList{Handler,Screen}.tsx`,
  `libs/ui/src/data/url/productListQuery.ts` — the four files this document converges on
- `docs/trd-order-app-nextjs-migration.md` — D2 (Vercel, not GitHub Pages), D4 (`getLayout`, deleted
  by D6), D5/D5.1/D5.2 (the mount gate and `router.isReady`, both deleted), D13 (the same-origin
  proxy, kept for the browser), D20 (the barrel warning, now stale — §3.7)
- `docs/trd-ui-presentation-split-by-app.md` — D5 (`app/` is its own layer), D6 (roots stay in
  `libs/ui`), D7 (layer-major), D10 (the lint guardrail pattern)
- `docs/prd-table-ordering.md` — D3 (the anonymous session), D17 (scan-the-QR fallback), D18
  (client-only, and why), D19 (Back dismisses an overlay), D22 (the `X-Session-Id` header), §2.2 (the
  route table D6 changes)
- `docs/prd-order-app-ux-improvements.md` — FR-9 (the cart item edit modal)
- `docs-site/public/screenshots/README.md` — the relative-base-URL trap, §2.5a
- `docs-site/under-the-hood/clean-architecture.md` — the four-layer description this makes true for
  the order app
