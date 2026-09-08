# TRD — Make `apps/order-web` look like `apps/pos-web`: composition in `libs`, rendered on the server

**Status:** proposed
**Scope:** `apps/order-web/src/**`, `libs/ui/src/app/order/**`, `libs/ui/src/data/**`, `libs/ui/src/domain/{repositories,usecases}/**`, `libs/ui/src/index.order.ts`, `libs/api-contract/src/client.ts`, `libs/ui/.eslintrc.json`, `apps/order-web/.eslintrc.json`, `apps/order-web/.env.example`, `apps/order-web-e2e/**`, Vercel env, `docs-site/under-the-hood/clean-architecture.md`
**Non-scope:** `apps/pos-web`, `apps/pos-mobile`, `apps/api`, `libs/provider`, App Router, the customer-facing UI itself — no screen, copy, layout or interaction changes (two **URLs** change; see D6)
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
page. `_app.tsx` owns the order-specific provider stack plus a mount gate.

**It renders client-only.** Not by preference — it had to. It was a static bundle on GitHub Pages, so
there was no server to render on and no server to mint a session (D18/D19 in
`docs/prd-table-ordering.md`, D2 in the migration TRD). **That constraint expired when the app moved
to Vercel.** What is left of it is a mount gate that makes the server emit an empty shell, a
`router.isReady` gate that exists because `router.query` is empty until hydration, and a QR scan that
paints a skeleton where the POS would have painted data.

The two are entangled: the order app cannot read params the POS way (`ctx.params` → props) because it
has no `getServerSideProps`, and it has no `getServerSideProps` because of a hosting constraint that
no longer applies. Fixing them separately means writing client-side param plumbing and then deleting
it. **This document fixes them as one change**, in eight phases, each small, reviewable and
independently revertable.

**This document implements nothing.**

---

## 2. Current state audit

### 2.1 Everything in `apps/order-web/src` today

| File | Lines | What it does | Fate |
|---|---|---|---|
| `components/TableLayout.tsx` | 42 | `useRouter().isReady` gate → `LoadingView`; reads `code`; renders `TableResolve` | **deleted** (P5) — the page entries render `TableResolve` directly with a seeded table |
| `components/MenuLayout.tsx` | 30 | reads `code`; renders `TableLayout` → `MenuList` + `children` | **deleted** (P3) |
| `components/CartLayout.tsx` | 27 | reads `code`; renders `TableLayout hideCartBar` → `Cart` + `children` | **deleted** (P4) |
| `pages/_app.tsx` | 65 | `<Head>`, CSS, `RootProvider`, **mount gate**, `SessionProvider`, `CartProvider`, `getLayout` dispatch | gate and `getLayout` deleted; providers stay, nested inline (P2, D8) |
| `pages/_document.tsx` | 55 | Tamagui SSR CSS collection | **stays** (framework shell) |
| `pages/index.tsx`, `pages/404.tsx` | 15 | `<TableResolve code={null} />` | → `TableScanPage` (P5) |
| `pages/t/[code]/index.tsx` | 14 | local `NextPage & {getLayout}` type; `() => null`; `getLayout` | → `MenuListPage` + loader (P3) |
| `pages/t/[code]/products/[productId].tsx` | 24 | parses `productId`; renders `MenuItemDetail`; `getLayout` | **deleted** (P3) — becomes `?product=` on the menu route (D6) |
| `pages/t/[code]/cart/index.tsx` | 14 | `() => null`; `getLayout` | → `CartPage` + loader (P4) |
| `pages/t/[code]/cart/items/[cartItemId].tsx` | 24 | parses `cartItemId`; renders `CartItemEdit`; `getLayout` | **deleted** (P4) — becomes `?item=` on the cart route (D6) |
| `pages/t/[code]/checkout.tsx` | 24 | reads `code`; renders `Checkout`; `getLayout` | → `CheckoutPage` + loader (P5) |
| `pages/global.css` | — | `#__next` sizing | **stays** |

Everything else in the app — `next.config.js`, `tamagui.config.ts`, `project.json`, `tsconfig.json`,
`vercel.json`, `public/` — is build configuration, untouched except where P8 says otherwise.

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

The pattern across all 56 POS route files is identical: a `getServerSideProps` — the only place the
app talks to the framework's request — and `export default <CompositionRoot>`. Route params are read
there (`parseInt(ctx.params?.productId ?? '')` in
`apps/pos-web/src/pages/products/[productId]/index.tsx`) and handed to the composition root as props.
Repositories are instantiated there, imported from the root barrel `@gatherloop-pos/ui`. No POS page
renders JSX of its own.

**The root barrel is POS-free** as of `b5696b3` (`libs/ui/src/index.ts` exports `config`, `data`,
`domain`, `utils` and one component — not `./app`), so the order app can import repositories from it
the same way, without dragging POS composition roots into its bundle. The migration TRD's D20 warning
that "the root barrel re-exports `./app`" is stale.

### 2.3 The seeding contract mostly exists already

This is what makes the plan cheap. Three of the four order usecases already accept SSR seed params
and already start in a loaded state when given them — the contract the POS relies on:

| Usecase | Params | `getInitialState()` when seeded | Needs work? |
|---|---|---|---|
| `MenuListUsecase` | `{ products, categories, variants? }` | `type: products.length >= 1 ? 'loaded' : 'idle'` | no |
| `MenuItemDetailUsecase` | `{ productId, product? }` | `'selectingOptions'`/`'resolvingVariant'`, not `'idle'` | no |
| `CartUsecase` | `{ cart? }` | `type: cart ? 'loaded' : 'idle'` | no (unused — D5) |
| `TableResolveUsecase` | `{ code }` | `'noCode'`, or `'idle'` → resolves | **yes** — gains `table?: PublicTable \| null`, returning `'resolved'` when seeded |

`useController` (`libs/ui/src/presentation/controllers/controller.ts`) reads `getInitialState()` once,
into `useReducer`'s initial value. A seeded usecase therefore hydrates as loaded and never fires its
mount fetch — exactly how `apps/pos-web/src/pages/products/index.tsx` and `ProductListUsecase` work
today.

`Product` carries `options` as a **required** field (`libs/api-contract/src/api.yaml`), and
`publicProductList` returns full `Product`s. So the menu payload already contains everything the item
detail sheet needs to render — which is what makes D6 possible.

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
`http://localhost:3000/api`), so every POS server-side request hairpins out of the Node process, back
into the same deployment, through `rewrites()`, and only then to the API — a wasted round trip per
request. Not the fix to copy. See D2.

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

**(c) Nothing else.** With D6 collapsing the overlay routes, every screen a route renders is owned by
that route's own page component, so `getServerSideProps` and its consumer are on the same side of the
boundary. No shared-layout data plumbing is needed.

---

## 3. Target architecture

### 3.1 The rule

> An `apps/order-web` page file contains a `getServerSideProps` and a default export, and no JSX.
> Everything it renders — screens, providers, the composition of one against another — comes from
> `libs/ui/src/app/order`. `libs/ui` imports nothing from `next`.

This is the POS shape exactly. `getServerSideProps` is the Next adapter, the same category as
`_document.tsx`, and it stays on the Next side of the boundary; the library stays framework-agnostic
so Metro can keep bundling it for `apps/pos-mobile`. Where a loader needs order-specific logic, the
library exposes it as a **pure function over primitives** — never over `GetServerSidePropsContext`.

For the order slice this is stricter than the library is today: `libs/ui/src/utils/url.ts` imports
`GetServerSidePropsContext` from `next` and is used by ten POS pages. Bringing that under the same
rule is out of scope (§10).

### 3.2 Target tree

```
libs/ui/src/
├── app/order/
│   ├── MenuListPage.tsx          # NEW  TableResolve + MenuList + the ?product sheet
│   ├── CartPage.tsx              # NEW  TableResolve + Cart + the ?item modal
│   ├── CheckoutPage.tsx          # NEW  TableResolve + Checkout
│   ├── TableScanPage.tsx         # NEW  `/` and `404`
│   ├── useOverlayParam.ts        # NEW  reads ?product / ?item (D10)
│   ├── SessionProvider.tsx       # CHANGED  takes a sessionId, reconciles in an effect
│   ├── CartProvider.tsx          # unchanged
│   ├── TableResolve.tsx          # CHANGED  accepts a seeded table
│   ├── MenuList.tsx  MenuItemDetail.tsx  Cart.tsx  CartItemEdit.tsx  Checkout.tsx   # unchanged
│   └── index.ts
└── data/session/
    ├── constants.ts              # NEW  cookie/storage keys, max-age, the UUIDv4 pattern
    ├── resolveSession.ts         # NEW  pure: (cookieValue?) => { sessionId, setCookie? }
    └── CookieSessionRepository.ts # NEW  replaces browser/session.ts's minting path
```

```
apps/order-web/src/
├── pages/…                       # five route files: a loader and a default export
└── pages/{_app,_document}.tsx    # framework shell only; src/components/ is gone
```

No layout components, no `getLayout`, no `OrderPage` type, no provider wrapper, no loader module in
`libs`. All four were scaffolding for problems D6, D7 and D8 remove.

### 3.3 The routes

| Path | Page | Loader fetches |
|---|---|---|
| `/` | `TableScanPage` | session |
| `/t/{code}` | `MenuListPage` | session, table, menu |
| `/t/{code}?product={id}` | `MenuListPage` | *same request* — the sheet renders from the menu payload |
| `/t/{code}/cart` | `CartPage` | session, table |
| `/t/{code}/cart?item={id}` | `CartPage` | *same request* |
| `/t/{code}/checkout` | `CheckoutPage` | session, table |
| anything else | `TableScanPage` (`404.tsx`) | — (D11) |

### 3.4 A page, in full

```tsx
// apps/order-web/src/pages/t/[code]/index.tsx — the whole file
import {
  ApiMenuRepository,
  ApiPublicTableRepository,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { MenuListPage, MenuListPageProps } from '@gatherloop-pos/ui/order';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<MenuListPageProps> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(ctx.req.cookies[SESSION_ID_COOKIE_NAME]);
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const client = new QueryClient();
  const table = await new ApiPublicTableRepository().resolveTableByCode(
    String(ctx.params?.code ?? '')
  );
  const menu = await new ApiMenuRepository(client).fetchMenu({ query: '' });

  return { props: { sessionId, code: String(ctx.params?.code ?? ''), table, menu } };
};

export default MenuListPage;
```

`resolveSession` is the pure helper (D3): it validates the cookie value against the existing UUIDv4
pattern, mints one when it is missing or malformed, and returns the `Set-Cookie` string to write. It
takes a string, not a request. `resolveTableByCode` returns `null` for an unknown code and
`TableResolve`'s existing `notFound` state renders what it renders today.

### 3.5 A page component, in full

```tsx
// libs/ui/src/app/order/MenuListPage.tsx
export type MenuListPageProps = {
  sessionId: string;
  code: string;
  table: PublicTable | null;
  menu: { products: Product[]; categories: Category[]; variants: Variant[] };
  // The sheet's initial state, from `ctx.query` — see useOverlayParam (D10).
  initialProductId: number | null;
};

export function MenuListPage({ code, table, menu, initialProductId }: MenuListPageProps) {
  const productId = useOverlayParam('product', initialProductId);

  return (
    <TableResolve code={code} table={table}>
      <MenuList tableCode={code} menu={menu} />
      {productId !== null && <MenuItemDetail productId={productId} />}
    </TableResolve>
  );
}
```

`MenuList` stays mounted while the sheet opens and closes because **nothing above it changes** — same
route, same component, same position. That is what `getLayout` was buying, obtained structurally
instead.

### 3.6 `_app.tsx` after P2

```tsx
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>{/* unchanged */}</Head>
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <SessionProvider sessionId={pageProps.sessionId}>
          <CartProvider>
            <Component {...pageProps} />
          </CartProvider>
        </SessionProvider>
      </RootProvider>
    </>
  );
}
```

Three deletions from today: the `mounted` state and its effect, the `getLayout` dispatch, and the
local `OrderPage` type. The provider nesting is written inline, the way
`apps/pos-web/src/pages/_app.tsx` nests `NextThemeProvider` → `RootProvider` (D8).

### 3.7 `libs/ui/src/index.order.ts` after P7

Keeps what `libs/provider` and the shell need (`config` — `tamaguiConfig` and
`ConfirmationAlertProvider` are imported by `libs/provider/src/provider.tsx` — plus `LoadingView`,
`OrderLayout`, `MenuItemThumbnail`, `currency`) and swaps the eight inner composition roots for the
four page entries, their prop types, `SessionProvider` and `CartProvider`. The inner roots stay
reachable inside the library through `./app/order/index.ts`; they are no longer public API.
`resolveSession` and the session constants are exported from the root barrel `@gatherloop-pos/ui`
alongside the repositories, because that is what the loaders import.

---

## 4. What this costs

**Navigating between the three page-level routes gains a server round trip.** Next fetches
`/_next/data/<buildId>/….json` and waits for `getServerSideProps` before rendering. So menu → cart,
cart → checkout and Back now wait on the server for a session-and-table payload (no menu, no cart —
small, but a round trip).

**Opening the item sheet or the cart-item modal does not**, because D6 makes those the same route,
reached with `shallow: true`. They get *faster* than today: the sheet renders from the menu payload
the server already sent, with no fetch at all, where today it mounts a skeleton and fetches the
product.

What the change buys:

| Win | Size |
|---|---|
| A QR scan paints the real menu instead of a skeleton — one round trip instead of three sequential ones (HTML → JS → table resolve → menu fetch) | **Large.** This is the app's entry path; every guest pays it once |
| The item sheet opens with no network call at all (§2.3) | Medium — and it is the app's most-used interaction |
| No "Memuat meja…" gate, no `router.isReady` flash, no empty server shell | Medium |
| The mount gate, the readiness gate and the interceptor-ordering hazard (§2.4b) all disappear | Medium |
| `apps/order-web` pages become structurally identical to `apps/pos-web` pages | The stated goal |

---

## 5. Decisions

### D1 — `getServerSideProps`, Pages Router, no App Router

The POS is Pages Router and convergence is the point. Server Components would let a layout fetch its
own data, which is the strongest argument for App Router anyone in this repo has, and it is also a
rewrite of both frontends' routing. Not now. `getStaticProps` + ISR is tempting for the menu (it is
the same for every guest) but the table code is a route param with an unbounded value space and the
catalog changes whenever staff edit a product; see D12.

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

`resolveSession(cookieValue?: string)` is a pure function in `libs/ui/src/data/session`: it validates
against the UUIDv4 pattern `BrowserSessionRepository` already uses and, when the value is missing or
malformed, mints one and returns a `Set-Cookie` string with the same `Max-Age`, `Path`, `SameSite`
and `Secure` attributes the browser writes today. It takes and returns strings, so it carries no
`next` dependency (§3.1) and is trivially testable.

`BrowserSessionRepository` is replaced by a repository that is *given* an id:

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
`_app.tsx` to thread `pageProps.cart` into `CartProvider` — reintroducing coupling this document
removes. The floating bar popping in a beat after paint is what happens today, so this is parity, not
a regression. `CartParams.cart` stays in the domain layer, unused, for when D12 revisits it.

This also keeps the catalog routes' HTML identical for every guest, which is what makes the caching
follow-up possible at all.

### D6 — The item sheet and the cart-item modal are query params, not routes

`/t/{code}/products/{id}` becomes `/t/{code}?product={id}`; `/t/{code}/cart/items/{id}` becomes
`/t/{code}/cart?item={id}`. Both are opened with `router.push(…, { shallow: true })`, which keeps the
history entry (so Back still dismisses, D19 in `docs/prd-table-ordering.md`) and skips
`getServerSideProps` entirely.

This is the decision that removes the most machinery. Because the overlay and its parent are now one
route rendered by one component:

- **`getLayout` is deleted.** It existed only so `MenuList` (resp. `Cart`) kept its position in the
  tree across a route change. There is no route change any more.
- **The mount-preservation risk is gone**, not mitigated — the menu's scroll position, search text and
  category filter cannot be lost to a remount that cannot happen. This was the plan's largest
  untested risk.
- **The sheet opens with no network call**, because `Product.options` is required on the menu payload
  (§2.3). Today it mounts a skeleton and fetches.
- **Two page files disappear**, and with them the last two hand-rolled `Number(router.query.x)` parses.

What it costs: two user-facing URLs change, contradicting the route table in
`docs/prd-table-ordering.md` §2.2, and the deep-link assertions in
`apps/order-web-e2e/src/table-ordering.spec.ts` change with them. Printed QR codes are unaffected —
`getTableOrderUrl()` encodes only `/t/{code}`. No redirect from the old paths is proposed: they were
never printed, never shared outside the app, and the app is four months old; `404.tsx` already sends
anything unmatched to the scan-the-QR screen. Add redirects in `next.config.js` if that turns out to
be wrong — it is a three-line change.

### D7 — Loaders live in the pages, like the POS

An earlier draft put them in `libs` to avoid repeating a preamble, on the grounds that
`apps/pos-web` repeats its auth check in 56 files. Rejected: the order app has five route files, not
56; `getServerSideProps` is framework glue and belongs with `_document.tsx` on the Next side; and
`libs/ui` is Metro-bundled for `apps/pos-mobile`, where server-only code has no business being
reachable even accidentally. Shared logic still lives in the library — as pure functions over
primitives (D3), not over `GetServerSidePropsContext`.

### D8 — No order-specific provider wrapper

`_app.tsx` nests `SessionProvider` → `CartProvider` inline (§3.6), the way
`apps/pos-web/src/pages/_app.tsx` nests `NextThemeProvider` → `RootProvider`. An earlier draft wrapped
them in an `OrderProviders` component because the mount gate had to be coordinated with them; with
the gate deleted (D3) that wrapper only hides two lines of nesting. The one piece of real logic — a
missing `sessionId` on the 404 route (D11) — belongs inside `SessionProvider`, next to the session it
concerns.

### D9 — Keep the props-taking composition roots; add `*Page` entries beside them

`MenuList`, `MenuItemDetail`, `Cart`, `CartItemEdit`, `Checkout` and `TableResolve` keep their props
and gain seeded ones. The four `*Page` components take the loader's props and compose them (§3.5).

The alternative — one component per route doing composition and rendering — would make each root
untestable and unstoryable without a router and would rewrite `CartItemEdit.test.tsx`, the one
existing test in `app/order/`. Props in, framework at the edge, is also what the POS does:
`getServerSideProps` reads the request, `ProductUpdate` takes `productUpdateParams`.

### D10 — Path params arrive as props; overlay params are read from the router

`code` comes from `ctx.params` and arrives as a prop, exactly as
`apps/pos-web/src/pages/products/[productId]/index.tsx` gets `productId`. `TableLayout`'s
`router.isReady` gate goes with it: there is nothing to wait for when the value is a prop.

`?product` and `?item` are the exception, and they have to be: shallow routing deliberately does not
re-run the loader, so the prop would be stale the moment the guest opens a sheet. `useOverlayParam`
bridges the two:

```ts
// libs/ui/src/app/order/useOverlayParam.ts
export const useOverlayParam = (key: string, initial: number | null): number | null => {
  const router = useRouter();          // next/router
  if (!router.isReady) return initial; // the SSR-seeded value, until the router hydrates
  const raw = router.query[key];
  return typeof raw === 'string' && raw !== '' ? Number(raw) : null;
};
```

Seeding `initial` from `ctx.query` in the loader is what keeps a deep-linked
`/t/{code}?product=5` from rendering the menu and then popping the sheet in after hydration.

This is the one `next` import in `app/order/**`. `solito`'s `createParam` would keep the import
framework-neutral but has no readiness signal, which is precisely the flash this avoids. The order
app is Next-web-only, `libs/ui/src/utils/queryParam.ts` already imports `next/router`, and D13's lint
rule confines it to `app/order/**` so it can never reach the Metro-bundled POS paths.
`libs/ui/src/__mocks__/next/router.ts` gains a named `useRouter` (it exports only a default `Router`
object today).

### D11 — `TableScanPage` serves both `/` and `404`; `404` gets no loader

Both render `<TableResolve code={null} />` today and are documented as the same outcome (D17 in
`docs/prd-table-ordering.md`). Next does not run `getServerSideProps` for the built-in 404 page, so
`TableScanPage` must render without a `sessionId`. `SessionProvider` treats a missing one as "mint on
the client in an effect" — the single remaining client-mint path, reached only by unmatched URLs.

### D12 — No CDN caching in this document

`Cache-Control: private, no-store`, which is what Next sends by default. Edge-caching the menu route
is a real opportunity — D5 keeps the HTML guest-independent precisely so it stays available — but it
interacts with the `Set-Cookie` on a first visit and with staff catalog edits, and it deserves its own
document.

### D13 — A lint rule keeps the pages to a loader and a default export

`apps/order-web/.eslintrc.json` gains, for `src/pages/**` excluding `_app.tsx`/`_document.tsx`:

```json
{
  "files": ["src/pages/**/*.tsx"],
  "excludedFiles": ["src/pages/_app.tsx", "src/pages/_document.tsx"],
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["react", "tamagui", "next/router", "./*", "../*"],
          "message": "An order page is a getServerSideProps and a default export. Screens, providers and composition come from @gatherloop-pos/ui/order. See docs/trd-order-app-composition-and-ssr.md."
        }
      ]
    }]
  }
}
```

`next` and `@gatherloop-pos/ui` stay allowed — the loader needs `GetServerSideProps` and the
repositories. Banning relative imports is what forbids a new `src/components/`; banning `react` and
`tamagui` is what forbids JSX creeping back in.

`libs/ui/.eslintrc.json` gains the mirror: `next/router` and `next` are restricted under
`src/app/pos/**` and `src/presentation/**`, which Metro bundles for `apps/pos-mobile`.
`src/utils/queryParam.ts` and `src/utils/url.ts` are outside both globs and are unaffected (§10).

### D14 — Behaviour is preserved, including the parts that look like bugs

Today a garbage `productId` yields `NaN`, the usecase 404s, and the sheet renders nothing. Under SSR
the loader could return `notFound: true` instead. **It does not** — `useOverlayParam` yields `null`
or an id, the existing states render what they render today, and a `?product=` pointing at nothing
shows the sheet's own error state. If that deserves improving, it is a separate PR with its own test,
not a rider on a refactor.

### D15 — The new `*Page` entries get no stories

They compose three children and take props a story would have to fabricate. The screens underneath
are already storied (`MenuListScreen.stories.tsx`, `CartScreen.stories.tsx`, …) and stay so.
`resolveSession`, `CookieSessionRepository`, `useOverlayParam` and `SessionProvider` get jest tests
instead.

---

## 6. Parity contract

The acceptance bar for every phase. Anything here that regresses is a blocker, not a follow-up.

1. Every screen in §3.3 is reachable at its listed URL, including a hard navigation / refresh / QR
   scan. The two overlay URLs change, by D6; nothing else does.
2. **Opening an item sheet does not remount the menu**: scroll position, search text and selected
   category survive open → close, by both the close button and browser Back. Same for the cart and
   its edit modal. (Menu state across menu → cart → menu is *not* preserved today either — `MenuList`
   unmounts with `MenuLayout` — and this document does not change that.)
3. The table resolves once per visit — no "Memuat meja…" flash moving menu → cart → checkout.
4. No scan-the-QR or "QR tidak valid" flash before the real screen on a deep link, and no sheet
   popping in after hydration on a `?product=` deep link (D10).
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

Each phase is one PR, ships on its own, and leaves the deployed app working. P1 and P2 change no
rendering; the first user-visible change is P3.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P1 | `fix(api-contract): resolve the API base URL per environment` | — | S |
| P2 | `refactor(ui): mint the order session on the server` | P1 | M |
| P3 | `refactor(order-web): server-render the menu route` | P2 | L |
| P4 | `refactor(order-web): server-render the cart route` | P3 | M |
| P5 | `refactor(order-web): server-render checkout and the scan-QR screen` | P4 | M |
| P6 | `test(order-web-e2e): follow the overlay URL change` | P5 | S |
| P7 | `chore(order-web): keep order pages thin` | P6 | S |
| P8 | `docs: refresh the order app architecture notes` | P7 | S |

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

### P2 — Server-minted session; the mount gate goes

**Adds** `libs/ui/src/data/session/{constants,resolveSession,CookieSessionRepository}.ts` + tests.
**Touches** `SessionProvider` (takes `sessionId`, reconciles in an effect, D3/D4, and mints on the
client when the prop is absent, D11) + tests; `_app.tsx` (§3.6, minus the `getLayout` deletion —
that lands with the last page in P5); all seven page files gain a `getServerSideProps` that resolves
the session and nothing else.
**Deletes** `libs/ui/src/data/browser/session.ts`'s minting path and `_app.tsx`'s `mounted` gate.

The server now renders the real tree instead of `null`. Nothing else is seeded, so every screen still
starts `idle` and fetches on mount — first paint gains the shell and the skeletons, not the data.
That is deliberate: **this phase's risk is hydration, and it is much easier to diagnose with one
variable changed.**

**Verify:** `nx run ui:test`; `nx run order-web:build && nx run order-web:start` — view source on
`/t/{code}` shows the shell in the HTML, with **no hydration warning in the console** (parity item
10). The session cookie survives a reload; deleting the cookie while keeping
`localStorage.gl_session_id` restores the same cart (parity item 5, D4); `X-Session-Id` is on every
`/carts/*` request and on nothing else; the 404 route mints client-side without errors.
`nx run order-web-e2e:e2e` green.

**If hydration cannot be made clean here, stop and take §7.1's fallback** — do not start P3.

### P3 — The menu route

The largest phase, because D6 collapses two routes into one and the seeding lands with it.

**Touches** `TableResolveUsecase` (add the `table?` param and the `'resolved'` initial state, §2.3) +
its tests; `TableResolve`, `MenuList`, `MenuItemDetail` (accept seeded props).
**Adds** `libs/ui/src/app/order/{MenuListPage.tsx,useOverlayParam.ts}` + tests;
`apps/order-web/src/pages/t/[code]/index.tsx`'s loader (§3.4).
**Changes** `MenuListScreen`'s item-tap handler and `MenuItemDetailScreen`'s close handler to
`router.push('/t/{code}?product={id}', undefined, { shallow: true })` and `router.back()`.
**Deletes** `apps/order-web/src/pages/t/[code]/products/[productId].tsx` and
`apps/order-web/src/components/MenuLayout.tsx`.

This is the phase the customer feels: a QR scan paints the menu, and the sheet opens instantly.

**Verify:** view source on `/t/{code}` contains product names; on `/t/{code}?product={id}` it contains
the sheet, with no post-hydration pop (parity item 4). Record, in the PR description, before/after
Largest Contentful Paint on a throttled connection and the transferred-bytes delta — the menu now
appears twice, as SSR markup and `__NEXT_DATA__`. Then **parity item 2, the blocking check**: scroll
the menu, type a search term, pick a category, open an item, close it with both the close button and
browser Back — scroll, search and category all survive, and the Network tab shows **no request at
all** on open or close.

### P4 — The cart route

**Adds** `libs/ui/src/app/order/CartPage.tsx` + tests; the cart route's loader (session + table, no
cart — D5).
**Changes** `CartScreen`'s line-tap and `CartItemEditScreen`'s close to the `?item=` shallow push.
**Deletes** `apps/order-web/src/pages/t/[code]/cart/items/[cartItemId].tsx` and
`apps/order-web/src/components/CartLayout.tsx`.

**Verify:** add to cart → the floating bar appears → the cart lists the line → open the edit modal
(the cart stays visible behind it, no request) → change amount and note → save → remove → clear-all
confirmation. Browser/Android Back dismisses the modal without leaving the cart. Reload
`/t/{code}/cart?item={id}` and the modal is open over the restored cart (parity items 1 and 5).

### P5 — Checkout, the scan-QR screen, and the last of `_app.tsx`

**Adds** `libs/ui/src/app/order/{CheckoutPage,TableScanPage}.tsx`; the checkout and `/` loaders.
**Touches** `_app.tsx` — the `getLayout` dispatch and the local `OrderPage` type come out, since no
page uses them any more.
**Deletes** `apps/order-web/src/components/TableLayout.tsx`, emptying `src/components/`.

After this phase every route file is a loader and a default export.

**Verify:** `/`, an unknown path and `/t/{code}/checkout` render as before; menu → cart → checkout
shows no "Memuat meja…" (parity item 3).

### P6 — e2e

**Touches** `apps/order-web-e2e/src/table-ordering.spec.ts` — the deep-link assertions move from
`/t/{code}/products/{id}` to `/t/{code}?product={id}`, and the tap-to-open assertions gain a check
that **no** request is issued (the behaviour D6 buys); `apps/order-web-e2e/playwright.config.ts`'s
`webServer.env`, which sets `NEXT_PUBLIC_API_PROXY_BASE_URL: '/api'` with no server-side var and
needs one.

The suite runs unchanged through P1–P5 except for the two overlay URLs; this phase is separate so
that a spec change never hides a behaviour change.

**Verify:** `nx run order-web-e2e:e2e` green from a fresh checkout with only `.env.example`'s
variables set.

### P7 — Guardrails and barrel

**Touches** `apps/order-web/.eslintrc.json`, `libs/ui/.eslintrc.json` (D13); `index.order.ts` (§3.7).

**Verify:** `npm run lint`; add a scratch page importing `tamagui`, confirm lint fails, delete it.
`nx run order-web:build` succeeds and First Load JS for `/t/[code]` is unchanged from P3's recorded
number.

### P8 — Environment and documentation

**Touches** `apps/order-web/.env.example` and the Vercel project env (`API_INTERNAL_BASE_URL`);
`docs-site/under-the-hood/clean-architecture.md`; `docs/prd-table-ordering.md` §2.2's route table and
`docs/trd-order-app-nextjs-migration.md` §2.2/§2.3/§5.1/§5.4 and D4/D5, which describe the overlay
routes, the mount gate and "No SSR" as the runtime posture — annotate as superseded here rather than
rewriting history.

**Verify:** docs-site builds; a Vercel preview deploy serves a real QR-scan path end to end.

### 7.1 If hydration cannot be made clean (the fallback)

P2 is the risk probe. If the Tamagui/react-native-web tree cannot be server-rendered without
mismatches, most of this plan still stands:

- Keep `_app.tsx`'s mount gate and drop the loaders' data fetching (keep the session resolution —
  server-minting works regardless of whether the tree renders).
- P3–P5 proceed as composition-only moves: the page entries still absorb the layouts and D6 still
  collapses the overlay routes, but props come from `useOverlayParam` and a client-read `code`
  instead of `ctx.params`, and the screens keep fetching on mount.
- The end state is §3.1 minus SSR — which is the whole of the original "no logic in `apps/`" goal, and
  which is where the POS's own pages were before they had `getServerSideProps`.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Hydration mismatch from `react-native-web`/Tamagui**, which the mount gate has hidden since the migration (D5 there: "the server emits an empty shell — there is nothing to mismatch") | **Medium, and this is the one to watch** | P2 exists precisely to surface it with one variable changed and nothing seeded. `apps/pos-web` server-renders the same stack on 56 pages today, which is strong evidence — but the order app's components are not the POS's. §7.1 is the pre-agreed fallback |
| P1 changes the base URL for `apps/pos-web`/`apps/pos-mobile` and breaks them | Low, **very** high impact | The `?? browserBaseUrl` fallback means "no server var set" resolves byte-identically to today. P1 is standalone and its acceptance test is a POS page rendering server-side |
| **Shallow routing does not behave as expected** for the overlay params — Back does not dismiss, or the loader re-runs anyway | Low, high impact | P3's manual checks cover both directions explicitly, and it is the first phase to use it. If shallow routing misbehaves, the fallback is local state plus a `history.pushState` shim in `useOverlayParam` — the URLs and the component tree stay as designed |
| Someone has bookmarked or shared `/t/{code}/products/{id}` | Low | Never printed (`getTableOrderUrl` encodes only `/t/{code}`), never linked outside the app, and `404.tsx` already lands unmatched paths on the scan-the-QR screen. Redirects in `next.config.js` are three lines if this proves wrong (D6) |
| A guest's cart appears empty after Safari evicts the cookie | Low, high impact | D4's rule, tested in P2. This is the case the localStorage mirror exists for, and server minting is what threatens it |
| Menu → cart → checkout feels slower than today's client-side transition | Medium, low impact | The payload is a session id and one table — no menu, no cart. Measured in P4/P5 alongside P3's LCP numbers. Unlike the sheet, these are deliberate page-level moves where a progress bar is expected; `nextjs-progressbar` is already wired in the POS if it is wanted here |
| The menu payload inflates the HTML — every product, category and variant inlined twice | Medium | P3 records the transferred-bytes delta alongside LCP. If JSON dominates, trim what the loader passes to the fields the cards and the sheet render; do not abandon SSR |
| Barrel churn in `index.order.ts` drags the POS into the customer bundle | Low, high impact | The root barrel is POS-free as of `b5696b3` (§2.2), and every new export in `index.order.ts` is a deep `./app/order/*` path. P7 re-measures First Load JS against P3's baseline |
| `next/router` inside `libs/ui/src/app/order` reaches the Metro bundle for `apps/pos-mobile` | Low | It cannot today: `apps/pos-mobile` imports `index.pos.ts`, which never reaches `app/order/**`. D13's mirror rule makes that structural rather than incidental |

---

## 9. Definition of done

- `apps/order-web/src/components/` does not exist, and no file under `apps/order-web/src/pages/`
  contains JSX except `_app.tsx` and `_document.tsx`.
- Every route file is a `getServerSideProps` and a default export — enforced by lint, not convention.
- `libs/ui/src/app/order/**` imports `next` in exactly one file (`useOverlayParam.ts`, D10).
- A QR scan to `/t/{code}` returns HTML containing the table name and the menu; tapping an item issues
  no network request.
- `nx run ui:test`, `npm run lint`, `nx run order-web:build`, `nx run pos-web:build` and
  `nx run order-web-e2e:e2e` are green.
- Every item in §6 verified by hand once, at P7.

---

## 10. Deliberately out of scope

- **`libs/ui/src/utils/url.ts`**, which imports `GetServerSidePropsContext` and is used by ten POS
  pages. §3.1's rule should reach it eventually; doing so means touching POS pages, which this
  document does not.
- **Edge/ISR caching of the menu** (D12) — its own document, once SSR is bedded in.
- **Server-rendering the cart** (D5) — revisit only with caching decided; the two interact.
- **Improving the unknown-id paths** (D14).
- **App Router / Server Components** (D1).
- **Splitting `libs/ui` into `libs/pos` and `libs/order`** — rejected with reasons in
  `docs/trd-ui-presentation-split-by-app.md` D8; nothing here changes that calculus.
- **Any change to `apps/pos-web` pages.** They are the reference, not the subject.

---

## References

- `docs/trd-order-app-nextjs-migration.md` — D2 (Vercel, not GitHub Pages), D4 (`getLayout`, deleted
  here by D6), D5/D5.1/D5.2 (the mount gate and `router.isReady`, both deleted), D13 (the same-origin
  proxy, kept for the browser), D20 (the barrel warning, now stale — §2.2)
- `docs/trd-ui-presentation-split-by-app.md` — D5 (`app/` is its own layer), D6 (composition roots
  stay in `libs/ui`), D7 (layer-major), D10 (the lint guardrail pattern)
- `docs/prd-table-ordering.md` — D3 (the anonymous session), D17 (scan-the-QR fallback), D18
  (client-only, and why), D19 (Back dismisses an overlay), D22 (the `X-Session-Id` header), §2.2 (the
  route table D6 changes), FR-4 to FR-9
- `docs/prd-order-app-ux-improvements.md` — FR-9 (the cart item edit modal)
- `docs-site/public/screenshots/README.md` — the relative-base-URL trap, §2.4a
- `apps/pos-web/src/pages/products/index.tsx` and `products/[productId]/index.tsx` — the reference
  `getServerSideProps`
- `docs-site/under-the-hood/clean-architecture.md` — the four-layer description this makes true for
  the order app
