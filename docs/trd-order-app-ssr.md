# TRD — Server-render the order app, the way the POS does

**Status:** proposed
**Depends on:** `docs/trd-order-app-composition-in-libs.md` (P1–P7 land first — see §8)
**Scope:** `apps/order-web/src/pages/**`, `libs/ui/src/app/order/**`, `libs/ui/src/data/{api,browser}/**`, `libs/ui/src/domain/repositories/{menu,publicTable,cart,session}.ts`, `libs/api-contract/src/client.ts`, `apps/order-web/.env.example`, `apps/order-web-e2e/playwright.config.ts`, Vercel env
**Non-scope:** `apps/pos-web`, `apps/pos-mobile`, `apps/api`, App Router, the customer UI itself — no screen, copy, layout or route changes
**Date of research:** 2026-09-08 (checked against the code at `b5696b3`)

---

## 1. The question, and the answer

The order app renders client-only because it had to: it was a static bundle on GitHub Pages, so
there was no server to render on and no server to mint a session (D18/D19 in
`docs/prd-table-ordering.md`, D2 in `docs/trd-order-app-nextjs-migration.md`). It is now a real Next
server on Vercel. **That constraint is gone, and the code is closer to ready than it looks.**

Every order usecase already accepts SSR seed params and already starts in a loaded state when given
them — the exact contract `apps/pos-web` relies on:

| Usecase | Params | `getInitialState()` when seeded |
|---|---|---|
| `MenuListUsecase` | `{ products, categories, variants? }` | `type: products.length >= 1 ? 'loaded' : 'idle'` |
| `MenuItemDetailUsecase` | `{ productId, product? }` | `'selectingOptions'`/`'resolvingVariant'`, not `'idle'` |
| `TableResolveUsecase` | `{ code }` | `'idle'` → resolves; `'noCode'` |
| `CartUsecase` | `{ cart? }` | `type: cart ? 'loaded' : 'idle'` |

`useController` reads `getInitialState()` once, into `useReducer`'s initial value, so a seeded
usecase hydrates as loaded and never fires the mount fetch. That is exactly how
`apps/pos-web/src/pages/products/index.tsx` + `ProductListUsecase` work today. Nobody has to build
the seeding mechanism; it is already there, unused by the order app.

**So: yes.** Three things genuinely block it, all fixable, and one real cost has to be accepted or
designed around. The rest of this document is those four things.

---

## 2. The three blockers

### 2.1 The API base URL is relative, and Node cannot resolve it

`libs/api-contract/src/client.ts`:

```ts
export const axiosInstance = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? Config['API_BASE_URL'],
});
```

`apps/order-web/.env.example` sets `NEXT_PUBLIC_API_PROXY_BASE_URL=/api` — the same-origin path
Next's `rewrites()` forwards (D13 in the migration TRD). A browser resolves `/api` against the
current origin; **Node does not**, so the first `getServerSideProps` that touches a repository
throws. This is not speculation — it is already written down as a known trap in
`docs-site/public/screenshots/README.md`:

> `NEXT_PUBLIC_API_PROXY_BASE_URL` … must be an **absolute** URL. Setting it to a relative path like
> `/api` breaks every page that fetches data server-side in `getServerSideProps` … and every list
> page 500s.

The POS works around it by setting the var to an absolute URL
(`apps/pos-web/.env.local`: `http://localhost:3000/api`), which means every POS server-side request
hairpins out of the Node process, back into the same Vercel deployment, through `rewrites()`, and
only then to the API. That is a wasted round trip per request, and it is not the fix to copy.

**Fix (D2):** resolve the base URL per execution environment inside `client.ts` — the server calls
the API origin directly, the browser keeps calling `/api`. One `typeof window` branch, and the
proxy's whole purpose (no CORS, no preflight for the browser) is untouched, because the browser's
behaviour does not change.

### 2.2 The session is minted in the browser, during render

`BrowserSessionRepository`'s constructor reads `document.cookie`, writes it, touches
`window.localStorage` and calls `crypto.randomUUID()` — and `SessionProvider` constructs it inside
`useState(() => new BrowserSessionRepository())`, which runs on the server too. That is the entire
reason `_app.tsx` gates the provider tree on `mounted` (D5.1 in the migration TRD): the server has to
emit an empty shell because the tree cannot be rendered on the server at all.

There is a second, quieter hazard in the same place. `CartUsecase` auto-fetches from `idle`, and
`useCartController`'s effect runs **before** `SessionProvider`'s effect (React runs child effects
before parent effects), so the `X-Session-Id` interceptor is registered after the cart controller
first fires. It works only because the cart machine takes two effect passes to reach a network call
— `idle` → dispatch `FETCH` → re-render → `loading` → fetch — by which time the parent's effect has
run. Nothing states that invariant; nothing tests it.

**Fix (D3):** mint the session on the server. `getServerSideProps` reads `gl_session_id` from
`ctx.req.cookies`, mints one with `crypto.randomUUID()` and `Set-Cookie` if it is missing or
malformed, and passes it as a prop. `SessionRepository` becomes a thing that is *given* an id rather
than one that goes and finds one; the cookie/localStorage reconciliation moves into an effect. The
mount gate is deleted, and the interceptor ordering stops mattering because the id is available
synchronously on the first render, server and client alike.

### 2.3 The layouts need the data, but only pages can fetch it

In the Pages Router only a page exports `getServerSideProps`, and after
`docs/trd-order-app-composition-in-libs.md` the thing that renders `TableResolve` and `MenuList` is a
`getLayout` layout, not the page. The data and the consumer are on opposite sides of the boundary.

**Fix (D6):** `_app.tsx` calls `Component.getLayout(page, pageProps)` instead of
`Component.getLayout(page)` — a one-line change — and the layouts take the seeded props. This is the
standard Pages Router shape for exactly this problem.

---

## 3. The cost, stated plainly

**Every client-side navigation between order routes gains a server round trip.** Next fetches
`/_next/data/<buildId>/…json` and waits for `getServerSideProps` before rendering the next route.
Today, tapping a menu item renders the sheet *immediately* with a skeleton and fills it in when the
product arrives. With SSR on that route, the tap does nothing visible until the server responds, then
the sheet appears fully populated.

On a fast connection that is 100–200 ms and reads as "instant". In a restaurant, on shared wifi, on
the customer's phone — the environment this app was designed for (`docs/prd-order-app-ux-improvements.md`)
— it can be a second of apparent unresponsiveness on the single most-used interaction in the product.

That is the trade. What SSR buys against it:

| Win | Size |
|---|---|
| A QR scan paints the real menu instead of a skeleton — one round trip instead of three sequential ones (HTML → JS → table resolve → menu fetch) | **Large.** This is the app's entry path; every guest pays it once |
| No "Memuat meja…" gate, no `router.isReady` flash, no empty server shell | Medium |
| The mount gate, the readiness gate and the interceptor-ordering hazard all disappear | Medium |
| `apps/order-web` pages become structurally identical to `apps/pos-web` pages | The stated goal |

**Recommendation:** SSR the routes a guest *arrives* on and accept the round trip on the routes a
guest *navigates* to only if it measures well. §5 sequences it so the measurement happens before the
irreversible part, and D9 states the fallback in advance.

---

## 4. Decisions

### D1 — `getServerSideProps`, Pages Router, no App Router

The POS is Pages Router and this TRD's whole point is convergence. `getStaticProps` + ISR is
tempting for the menu (it is the same for every guest) but the table code is a route param with an
unbounded value space and the catalog changes whenever staff edit a product. Revisit as a follow-up
(D11), not now.

### D2 — `client.ts` resolves the base URL per environment

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

The `?? browserBaseUrl` tail is what makes this safe for `apps/pos-web` and `apps/pos-mobile`: with
neither server var set, every consumer resolves exactly what it resolves today. React Native has no
`window`, so the fallback also keeps Metro on the browser branch. POS deployments can opt into the
direct hop later by setting `NEXT_PUBLIC_API_BASE_URL`; that is their change to make, not this
TRD's.

### D3 — The session id is minted on the server and passed down as a value

`SessionRepository` gains nothing; `BrowserSessionRepository` is replaced by a repository
constructed with an id:

```ts
export class CookieSessionRepository implements SessionRepository {
  constructor(private readonly sessionId: string) {}
  getSessionId = () => this.sessionId;
  // getTableCode / setTableCode keep reading localStorage lazily — they are
  // called from effects and event handlers, never during render.
}
```

`SessionProvider` takes `sessionId` as a prop, constructs the repository from it, and does the
cookie/localStorage reconciliation in an effect (where touching `document` is legal). Server and
client compute the same id from the same cookie, so there is no hydration mismatch and no gate.

The cookie stays readable from JavaScript (not `HttpOnly`): the localStorage mirror in D4 needs it,
and the browser still sends `X-Session-Id` as a header rather than relying on the cookie travelling
(D22 in `docs/prd-table-ordering.md` — unchanged).

### D4 — The localStorage mirror still wins on the client

Safari's ITP evicts the cookie; the localStorage mirror is what survives, and re-promoting it is what
keeps a guest's cart across that eviction (parity item 5). But the server, seeing no cookie, will
have minted a *new* id for that same request.

Rule: **the server's id is authoritative for the SSR pass; a valid, differing localStorage id wins on
the client**, is re-promoted to the cookie in `SessionProvider`'s effect, and the cart refetches once
under it. Cost: one wasted server-side cart fetch and one client refetch, in a case that happens at
most once per eviction. Benefit: the ITP guarantee is preserved exactly as documented today.

### D5 — The cart is **not** server-rendered

It is per-session, so an SSR'd cart makes every response private and uncacheable, and it would force
`_app.tsx` to thread `pageProps.cart` into `CartProvider` — reintroducing the coupling this pair of
TRDs is removing. The floating bar popping in a beat after paint is exactly what happens today, so
this is parity, not a regression. `CartParams.cart` stays in the domain layer, unused, for when D11
revisits it.

This also keeps the catalog routes' HTML identical for every guest, which is what makes the caching
follow-up possible at all.

### D6 — `getLayout(page, pageProps)`

`_app.tsx`:

```ts
const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
return <OrderProviders sessionId={pageProps.sessionId}>{getLayout(<Component {...pageProps} />, pageProps)}</OrderProviders>;
```

`OrderPage`'s type widens to `(page: ReactElement, pageProps: any) => ReactNode`. The layouts read
`pageProps.table` / `pageProps.menu` and pass them into `TableResolve` / `MenuList` as the seed
params those usecases already accept.

### D7 — `getServerSideProps` implementations live in `libs`, not in the pages

This is where the order app deliberately goes *further* than the POS. `apps/pos-web` repeats
`const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization')` in 56 files; that is the shape
`docs/trd-order-app-composition-in-libs.md` set out to avoid. So `libs/ui/src/app/order` exports the
loaders, and a page is three lines:

```tsx
// apps/order-web/src/pages/t/[code]/index.tsx — the whole file
import { MenuListPage, menuListServerSideProps } from '@gatherloop-pos/ui/order';

export const getServerSideProps = menuListServerSideProps;
export default MenuListPage;
```

Each loader composes two helpers, both in `libs`: `resolveSession(ctx)` (read-or-mint + `Set-Cookie`,
D3) and `resolveTable(ctx)` (fetch the table by `ctx.params.code`, or `notFound`/`noCode`). Nothing
about this pattern is order-specific; if it proves out, the POS can adopt it later (§9).

### D8 — Order repositories gain the `options?: Partial<RequestConfig>` parameter POS repos have

`ApiProductRepository.fetchProductById(productId, options?)` already does this so
`getServerSideProps` can forward request headers. `ApiMenuRepository.fetchMenu` /
`fetchProductById`, `ApiPublicTableRepository.resolveTableByCode` and every `ApiCartRepository`
method get the same optional parameter, passed straight through to the kubb client. Client-side call
sites pass nothing and are unaffected; the axios interceptor still handles the browser's
`X-Session-Id`, because there is no interceptor on the server.

### D9 — The overlay routes get SSR too, with a stated fallback

`t/[code]/products/[productId]` and `t/[code]/cart/items/[cartItemId]` render on top of a mounted
menu/cart, so they are the routes where §3's navigation cost is most visible — and also the ones
where a deep link currently shows *two* stacked skeletons.

They get `getServerSideProps` in S5, and S5's acceptance check is a measurement: the p75 delay
between tapping a menu card and the sheet appearing, on a throttled connection, against the same
measurement taken before the change. **If it regresses past 300 ms, drop `getServerSideProps` from
those two routes** — three lines per page, `MenuItemDetail`/`CartItemEdit` keep client-fetching as
they do today, and every other route keeps its SSR. Deciding this in advance is the point; deciding
it under pressure after S5 is not.

### D10 — The client-side route-param plumbing is deleted, not kept as a fallback

`useTableCode`, `useTableCodeParam`, `useNumericParam` and `TableLayout`'s `router.isReady` gate (all
introduced by `docs/trd-order-app-composition-in-libs.md` P1) all go away: `code` and `productId`
come from `ctx.params` and arrive as props, exactly as `apps/pos-web/src/pages/products/[productId]/index.tsx`
gets `productId`. Keeping both paths "just in case" would mean two sources of truth for the table
code, which is how the flash bug in D5.2 existed in the first place.

D9's fallback is the one exception: if the two overlay routes lose their loaders, they keep
`useNumericParam`.

### D11 — No CDN caching in this TRD

`Cache-Control: private, no-store` on every order response, which is what Next sends by default.
Edge-caching the menu route is a real opportunity — D5 keeps the HTML guest-independent precisely so
it stays available — but it interacts with the `Set-Cookie` on a first visit and with staff catalog
edits, and it is worth its own document rather than a paragraph here.

### D12 — This lands after the composition move, not instead of it

See §8.

---

## 5. Phase plan

Each phase is one PR. S1 and S2 change no rendering at all. The first user-visible change is S3.

| # | PR title | Depends on | Size |
|---|---|---|---|
| S1 | `fix(api-contract): resolve the API base URL per environment` | — | S |
| S2 | `refactor(ui): mint the order session on the server` | S1 | M |
| S3 | `feat(order-web): server-render the table shell` | S2 | M |
| S4 | `feat(order-web): server-render the menu` | S3 | M |
| S5 | `feat(order-web): server-render the item sheet and cart routes` | S4 | M |
| S6 | `chore(order-web): env, e2e and runbook for SSR` | S5 | S |

### S1 — Base URL, and the repository `options` parameter

**Touches** `libs/api-contract/src/client.ts` (D2); `libs/ui/src/data/api/{menu,publicTable,cart}.ts`
and their domain interfaces (D8); `apps/order-web/.env.example` (document
`API_INTERNAL_BASE_URL`).

No component changes, no rendering changes. This phase exists on its own because it is the one that
can silently break `apps/pos-web` and `apps/pos-mobile`, and it should be reviewable without any
order-app noise in the diff.

**Verify:** `nx run ui:test`; `nx run pos-web:build` and a POS list page renders server-side against
a local API (proves the fallback branch); `nx run order-web-e2e:e2e` green; a scratch
`getServerSideProps` in the order app that calls `ApiPublicTableRepository` returns data instead of
throwing on a relative URL — this is the phase's real acceptance test.

### S2 — Server-minted session

**Adds** `libs/ui/src/app/order/serverSession.ts` (`resolveSession(ctx)`: read `gl_session_id`,
validate against the existing UUIDv4 pattern, mint + `Set-Cookie` with the same
`Max-Age`/`Path`/`SameSite`/`Secure` attributes `BrowserSessionRepository` writes today) + tests;
`libs/ui/src/data/browser/cookieSession.ts` (D3) + tests.
**Touches** `SessionProvider` (takes `sessionId`, reconciles in an effect, D4);
`libs/ui/src/app/order/OrderProviders.tsx` (drops the mount gate);
`apps/order-web/src/pages/**` (each route gains a three-line loader, D7);
`_app.tsx` (passes `pageProps.sessionId`).
**Deletes** `libs/ui/src/data/browser/session.ts`'s minting path and the `mounted` state.

The server now renders the real tree instead of `null`. Nothing is seeded yet, so every screen still
starts `idle` and fetches on mount — first paint gains the shell and the skeletons, not the data.
That is deliberate: this phase's risk is hydration, and it is easier to see with one variable.

**Verify:** `nx run ui:test`; `nx run order-web:build && nx run order-web:start` — view source on
`/t/{code}` and confirm the shell is in the HTML, with no hydration warning in the console. The
session cookie survives a reload; deleting the cookie but keeping `localStorage.gl_session_id`
restores the same cart (D4); `X-Session-Id` is on every `/carts/*` request and on nothing else.
`nx run order-web-e2e:e2e` green.

### S3 — Server-render the table shell

**Touches** `serverSession.ts`'s sibling `resolveTable(ctx)`; the five `/t/[code]/**` loaders;
`TableLayout` (takes a seeded `table`/`code` prop, D6); `_app.tsx` (`getLayout(page, pageProps)`);
`TableResolve` (seeded params).
**Deletes** `useTableCode`, `useTableCodeParam`, `TableLayout`'s `isReady` branch and
`TableLayout.test.tsx`'s gate cases (D10).

**Verify:** view source on `/t/{code}` contains the table name; a hard navigation to a garbage code
returns the "QR tidak valid" screen with **no** flash of anything else; menu → cart → checkout shows
no "Memuat meja…". Confirm `TableResolve` still does not re-resolve on in-app navigation.
`nx run order-web-e2e:e2e` green.

### S4 — Server-render the menu

**Touches** `menuListServerSideProps` (adds the `fetchMenu` call, forwarding no session — the catalog
is public); `MenuLayout` (passes `products`/`categories`/`variants` into `MenuList`'s existing
`MenuListParams`).

This is the phase the customer actually feels: a QR scan paints the menu, not a skeleton.

**Verify:** view source on `/t/{code}` contains product names. Record, in the PR description, the
before/after of Largest Contentful Paint on a throttled connection — the number that justifies this
whole document. **Parity check:** scroll the menu, search, pick a category, open an item, close it —
scroll/search/category all survive, and `MenuList` does not remount or refetch (the seeded state is
only read on first mount, so navigation must not reset it).

### S5 — Server-render the item sheet and the cart routes

**Touches** the `products/[productId]` and `cart/items/[cartItemId]` loaders (`product` seeded into
`MenuItemDetailParams`); the cart and checkout loaders (table only, D5).

**Verify:** deep-link `/t/{code}/products/{id}` → the sheet renders populated over a populated menu,
no stacked skeletons. Then **D9's measurement**: tap-to-sheet p75 on a throttled connection, before
vs. after. If it regressed past 300 ms, take D9's fallback in this same PR and say so in the
description.

### S6 — Environment, e2e and runbook

**Touches** `apps/order-web/.env.example` and the Vercel project env (`API_INTERNAL_BASE_URL`);
`apps/order-web-e2e/playwright.config.ts` (the `webServer.env` block currently sets
`NEXT_PUBLIC_API_PROXY_BASE_URL: '/api'` with no server-side var — it needs the server one too);
`docs/trd-order-app-nextjs-migration.md` §2.3 and D5, which state "No SSR" as the runtime posture and
are superseded here; `docs-site/under-the-hood/clean-architecture.md`.

**Verify:** a clean `nx run order-web-e2e:e2e` from a fresh checkout with only `.env.example`'s
variables set; a preview deploy on Vercel serves a real QR-scan path end to end.

---

## 6. Parity contract

Unchanged from `docs/trd-order-app-composition-in-libs.md` §5, with three items sharpened because
this TRD is what puts them at risk:

- **Item 2 (no remount)** — SSR seeds `getInitialState()`, which `useController` reads only on first
  mount. Navigation must therefore *not* re-seed a mounted usecase. Checked explicitly in S4.
- **Item 5 (cart survives)** — including across cookie eviction with an intact localStorage mirror
  (D4). Checked explicitly in S2.
- **Item 3/4 (no flash)** — with SSR these should become impossible rather than merely fixed.

Two additions:

10. **Tap-to-sheet latency does not regress past 300 ms at p75** on a throttled connection (D9).
11. **No hydration mismatch warnings** on any route, in development or production.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **The navigation round trip makes the app feel slower** than the client-only version it replaces | Medium, high impact | §3 is honest that this is a trade, not a free win. D9 fixes the threshold and the fallback in advance; S5 measures before committing. S3/S4 are net wins regardless — they only affect arrival paths |
| S1 changes the base URL for `apps/pos-web` / `apps/pos-mobile` too and breaks them | Low, **very** high impact | The `?? browserBaseUrl` fallback means "no server var set" resolves byte-identically to today. S1 is a standalone PR whose acceptance test is a POS page rendering server-side |
| Hydration mismatch from `react-native-web` / Tamagui, which the mount gate has been hiding since the migration (D5 in the migration TRD said "the server emits an empty shell — there is nothing to mismatch") | **Medium, and this is the one to watch** | S2 exists precisely to surface it with one variable changed and nothing seeded. `apps/pos-web` server-renders the same Tamagui/RN-web stack on 56 pages today, which is strong evidence it works — but the order app's components are not the POS's |
| A guest's cart appears empty after Safari evicts the cookie | Low, high impact | D4's rule, tested in S2. This is the case the localStorage mirror exists for, and server minting is what threatens it |
| `Set-Cookie` on an SSR response interacts badly with any future CDN caching | Low today | D11 defers caching entirely; D5 keeps the HTML guest-independent so the option stays open |
| The menu payload inflates the HTML — every product, category and variant is now inlined twice (SSR markup + `__NEXT_DATA__`) | Medium | S4 records the transferred-bytes delta alongside LCP. If the JSON dominates, the fix is trimming `MenuListParams` to the fields the cards render, not abandoning SSR |
| SSR puts the Vercel Node runtime on the critical path for a QR scan, where before a cached static shell would render offline-ish | Low | Already true since D13's proxy put Vercel on every API call; this does not add a new dependency, only more weight to an existing one |

---

## 8. How this sequences with the composition TRD

`docs/trd-order-app-composition-in-libs.md` (P1–P7) lands first. Reasons:

1. Every SSR phase then edits `libs/ui/src/app/order` plus three-line page files. Done the other way
   round, S3–S5 would be rewriting code that is still spread across `apps/order-web/src/components`.
2. The layouts get tests (composition P1) *before* SSR changes their behaviour.
3. If S5's measurement kills the idea, the composition work stands on its own and nothing is wasted.

**Known overlap, accepted:** composition P1 adds `useOrderParams` and a `TableLayout` readiness test
that D10 deletes in S3. That is roughly 40 lines of code and 3 lines of test written and then
removed. It is still worth writing: it is what makes composition P1's move verifiable, and it is
cheaper than reordering the two efforts around it.

---

## 9. Deliberately out of scope

- **Edge/ISR caching of the menu** (D11) — its own document, once SSR is bedded in.
- **Server-rendering the cart** (D5) — revisit only with caching decided, since the two interact.
- **Adopting D7's "loaders live in libs" pattern for `apps/pos-web`.** If it proves out here, it
  removes 56 copies of the same auth-redirect block. Separate TRD, and the order app should be the
  one that carries the risk first.
- **App Router.** Server Components would make §2.3 disappear entirely (a layout can fetch its own
  data), which is the strongest argument for it anyone in this repo has. It is also a rewrite of both
  frontends' routing. Not now.

---

## References

- `docs/trd-order-app-composition-in-libs.md` — the prerequisite; its §5 parity contract is this
  document's §6
- `docs/trd-order-app-nextjs-migration.md` — D2 (Vercel, not GitHub Pages), D5 (the mount gate this
  TRD deletes), D13 (the same-origin proxy this TRD keeps for the browser)
- `docs/prd-table-ordering.md` — D3 (the anonymous session), D18 (client-only, and why), D22 (the
  `X-Session-Id` header)
- `docs-site/public/screenshots/README.md` — the relative-base-URL trap, §2.1
- `apps/pos-web/src/pages/products/index.tsx` — the reference `getServerSideProps`
