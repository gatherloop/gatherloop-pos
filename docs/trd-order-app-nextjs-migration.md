# TRD — Migrating `apps/order` from Vite SPA to Next.js

**Status:** proposed
**Scope:** `apps/order`, `apps/order-e2e`, `libs/ui` (order slices + navigation port), `libs/api-contract` (base-URL resolution), `docs-site` (`/order` path), `.github/workflows/deploy-pages.yml`, hosting, Storybook's builder
**Non-scope:** `apps/api`, `apps/web` (POS) behaviour, `apps/mobile`, the customer UI itself — no screen, copy, layout or interaction changes
**Date of research:** 2026-08-25 (all claims below were checked against the code at `fcb97e8`)

---

## 1. Problem statement

`apps/order` is the only frontend in this repo that is **not** a Next.js app. It is a React + Vite SPA
with a hand-rolled router, chosen deliberately in `docs/prd-table-ordering.md` (D18/D19) because the
app had to be a static bundle on GitHub Pages. That choice has been paid for twice over, in
`libs/ui` — the library that both apps share:

1. **Two routing systems.** `libs/ui` handlers cannot use `solito/router` the way every POS handler
   does, so the order slices navigate through a bespoke `useNavigation()` context port
   (`libs/ui/src/presentation/navigation/Navigation.tsx`), fed by a 70-line History-API router and a
   `matchPath` implementation in `apps/order/src/router/`. Six files in `libs/ui`
   (`MenuListHandler`, `MenuItemDetailHandler`, `CartHandler`, `CheckoutHandler`, `app/TableResolve`,
   `app/CartItemEdit`) plus their tests exist on the non-solito side of that split.
2. **Two ways to read configuration.** `libs/api-contract/src/client.ts` carries a
   `declare const __VITE_API_BASE_URL__` build-time global purely so a Vite `define` can reach it,
   and `libs/ui/src/app/Checkout.tsx` carries a second one, `__VITE_ORDER_CHECKOUT_ENABLED__`. Both
   are `typeof`-guarded so Next/Metro/Jest don't crash on them.
3. **A module boundary policed by hand.** `libs/ui/src/index.order.ts` exists so a Vite build never
   resolves `solito`/`next` (D20). Seventeen source files carry a "deep imports, not the root barrel"
   comment enforcing it.

On top of that, the SPA needs three separate hacks to survive on a static host: `dist/order/404.html`
as a byte-copy of `index.html`, a redirect script in `docs-site/.vitepress/config.ts` that bounces
deep links through `?redirect=`, and the `?redirect=` restoration in `apps/order/src/main.tsx`.

**This TRD proposes rewriting `apps/order` as a Next.js app**, so the customer app and the POS share
one framework, one router, one env mechanism and one build pipeline — with the customer-facing UI
and behaviour unchanged.

**This document implements nothing.** It records what has to change, what must not change, and a
phase plan where each phase is one small, reviewable, independently revertable PR that leaves the
live app working.

---

## 2. Current state audit

### 2.1 What `apps/order` actually is

| File | Lines | What it does | Fate |
|---|---|---|---|
| `index.html` | 18 | Static shell, `lang="id"`, `viewport-fit=cover` | → `_document.tsx` + `_app.tsx` `<Head>` |
| `src/main.tsx` | 27 | `createRoot`, CSS imports, `?redirect=` restoration | → `_app.tsx`; redirect hack **deleted** |
| `src/app/app.tsx` | 95 | Provider stack + the 6-entry route table | → `pages/**` + `getLayout` |
| `src/router/Router.tsx` | 70 | History API router, `popstate`, basename handling | **deleted** |
| `src/router/matchPath.ts` | 33 | `:param` matcher | **deleted** |
| `src/styles.css` | 10 | `html, body, #root { height:100%; margin:0 }` | → `global.css` (`#__next`) |
| `vite.config.ts` | 90 | base path, `define` globals, reanimated/moti aliases, Tamagui + React Compiler plugins | → `next.config.js` |

That is the **entire** app. Everything else — every screen, handler, controller, usecase, repository
and component — already lives in `libs/ui` and is reached through `@gatherloop-pos/ui/order`. The
migration is therefore a rewrite of ~340 lines of shell, not of the product.

### 2.2 The routes, exactly as they behave today

| Path | Renders | Note |
|---|---|---|
| `/` | `TableResolve code={null}` | "scan the QR at your table" |
| `/t/:code` | `TableResolve` → `MenuList` | |
| `/t/:code/products/:productId` | `TableResolve` → `MenuList` **+** `MenuItemDetail` | sheet **on top of** the menu |
| `/t/:code/cart` | `TableResolve hideCartBar` → `Cart` | |
| `/t/:code/cart/items/:cartItemId` | `TableResolve hideCartBar` → `Cart` **+** `CartItemEdit` | modal **on top of** the cart |
| `/t/:code/checkout` | `TableResolve hideCartBar` → `Checkout` | |
| anything else | `TableResolve code={null}` | no dedicated 404 screen |

Two structural facts fall out of that table, and they are the crux of this migration (§4, D4):

- `TableResolve` sits at the same position in the tree for **all** `/t/:code/*` routes, so React keeps
  it mounted across every in-app navigation. The table is resolved **once per visit**, not per screen.
- `MenuList` (resp. `Cart`) stays mounted while the detail sheet (resp. edit modal) is open. The
  menu's scroll position, search text and category filter survive opening and closing an item.

### 2.3 Runtime posture (all of it stays, except where D13 says otherwise)

- **No SSR.** Every usecase starts `idle` and fetches after mount (D18). First paint is the shell +
  skeletons.
- **Anonymous session.** `BrowserSessionRepository` mints a UUIDv4 **during construction**, reading
  `document.cookie`, `window.localStorage` and `crypto.randomUUID()` — i.e. it is constructed inside
  `useState(() => …)` in `SessionProvider` and **cannot run during a server render**.
- **Direct, cross-origin API calls** to `https://<vps-ip>.sslip.io` with `withCredentials: false` and
  an `X-Session-Id` header scoped to `/carts/*` (D21/D22). **This is the one runtime behaviour the
  migration deliberately changes** — the calls become same-origin through a Next rewrite (D13). The
  header, the session and every response are unchanged; only the hop is.
- **Cart lives above the router** (`CartProvider`), so it survives every navigation.

### 2.4 Hosting and the printed QR codes

`libs/ui/src/utils/tableOrderUrl.ts` hardcodes
`https://gatherloop.github.io/gatherloop-pos/order/t/{code}`, and that string is what the POS encodes
into every QR code it prints (`TableQrCode.tsx`). **QR codes already stuck on tables encode the
GitHub Pages origin.** Any hosting change has to keep that URL working, forever, or someone has to
walk the floor with a label printer.

---

## 3. What must not change (parity contract)

This is the acceptance bar for every phase. Anything on this list that regresses is a blocker, not a
follow-up.

1. Every URL in §2.2 resolves to the same screen, including a **hard navigation / refresh / QR scan**
   straight to `/t/{code}/products/{id}`.
2. Opening an item sheet does **not** remount the menu: scroll position, search text and selected
   category survive open → close. Same for the cart and its edit modal.
3. The table is resolved once per visit — no "Memuat meja…" flash when moving menu → cart → checkout.
4. The cart survives navigation and a full page reload; the floating cart bar shows the same counts.
5. The anonymous session id is stable across reloads (cookie + `localStorage` mirror).
6. Copy stays Bahasa Indonesia; the shell stays a phone-width column pinned to `100dvh` with the
   footer above the iOS home indicator.
7. Existing printed QR codes keep working.
8. `apps/web` (POS), `apps/mobile` and every existing `libs/ui` test keep passing untouched, except
   the order-slice tests deliberately rewritten in the final phase.

---

## 4. Decisions

### D1 — Next.js **Pages Router**, not App Router

`apps/web` is Pages Router; its `_document.tsx` already carries the Tamagui + `react-native-web`
`StyleSheet.getSheet()` SSR wiring that any Tamagui-on-Next app needs, and `solito/router` is the
router `libs/ui` handlers already use. App Router would mean a second rendering model in the repo,
`"use client"` on essentially every module (all of `libs/ui` is stateful client code), and a
different solito entry point — new ground for zero gain here.

The one App Router feature that is genuinely attractive — **intercepting routes**, the idiomatic
answer to "modal over a list with its own URL" — is not needed, because D4 solves that with a
Pages Router primitive.

### D2 — Deploy as a **real Next app on Vercel**, not a static export on GitHub Pages

Two options were considered seriously.

| | **A. `output: 'export'` → GitHub Pages** | **B. Server-rendered Next → Vercel** *(chosen)* |
|---|---|---|
| Routes | `getStaticPaths` cannot enumerate table codes (they are minted after deploy), so **every** route must collapse into one optional catch-all `pages/t/[[...slug]].tsx` that parses the slug itself | Real file-system routes: `pages/t/[code]/cart/items/[cartItemId].tsx` |
| Deep links | Still needs `404.html` byte-copy + the docs-site `?redirect=` bounce; still answers HTTP 404 | Plain HTTP 200 |
| URL / QR codes | Unchanged | **Origin changes** → needs a redirect shim (D3) |
| Ops | None | One more Vercel project (the POS is already there) |
| Net | Vite with a Next runtime bolted on: we'd keep a hand-written route table and every static-host hack, and gain only the framework name | The hand-written router, `matchPath`, `404.html`, `?redirect=` and both `__VITE_*` globals all get deleted |

Option A does not deliver the thing the migration is for. If the routing table stays hand-written in
`apps/order`, we have paid Next's cost and kept Vite's shape.

**Chosen: B.** The POS already builds and runs on Vercel from this monorepo (`vercel.json`), so this
is an existing capability, not new infrastructure. The order app gets its own Vercel project, on the
**Vercel-assigned `*.vercel.app` hostname** — no custom domain for now. `NEXT_PUBLIC_ORDER_APP_BASE_URL`
(§5.5) keeps that host out of the source, so moving to a custom domain later is an environment
variable plus a QR reprint, not a code change.

**Consequence, accepted:** the customer origin changes (`gatherloop.github.io/gatherloop-pos/order` →
`https://<app>.vercel.app`). D3 is how that is paid for. If a hosting change is vetoed, Option A is
implementable from the same phase plan — phases 1–4 are host-agnostic — at the cost of D4 collapsing
into a catch-all page.

**In scope, decided separately: a same-origin API proxy.** Having a server is precisely what makes
`rewrites()` possible, and it is adopted here — see **D13**.

### D3 — URL **paths** are preserved byte-for-byte; the old **origin** becomes a permanent redirect

- Paths stay `/t/{code}`, `/t/{code}/cart`, … with **no `basePath` and no `/order` segment** — the
  app owns the root of its own host, so a table URL is `https://<app>.vercel.app/t/{code}`. The
  `/order` prefix only ever existed because the SPA shared the Pages site with `docs-site` (D17).
  Every path string in `libs/ui` (`navigation.push(\`/t/${code}/cart\`)` and friends) is therefore
  unchanged.
- `libs/ui/src/utils/tableOrderUrl.ts` stops hardcoding the Pages URL and reads
  `NEXT_PUBLIC_ORDER_APP_BASE_URL`, so newly printed QR codes point at the new host and the value is
  configurable per environment.
- `https://gatherloop.github.io/gatherloop-pos/order/**` stays alive **forever** as a redirect shim:
  the docs-site 404 script (which already parses that prefix) is repointed to
  `https://<order-host>/t/{code}…`, and a small static `order/index.html` handles the bare path.
  Already-printed QR codes take one extra hop and land in the right place.

### D4 — Route composition uses **shared per-page layouts** (`Component.getLayout`)

This is what keeps parity items 2 and 3 in §3.

Next's Pages Router unmounts the page component on every navigation, but `_app.tsx` renders
`getLayout(<Component {...pageProps} />)` — and when two pages return **the same layout component at
the same position**, React reconciles it by type and **keeps that subtree, its state and its DOM
(including scroll offsets) mounted**. That is exactly the guarantee today's SPA gets for free.

So the shape mirrors §2.2's tree one-for-one:

| Page | `getLayout` |
|---|---|
| `t/[code]/index.tsx` | `page => <TableLayout><MenuList/>{page}</TableLayout>` (page renders `null`) |
| `t/[code]/products/[productId].tsx` | `page => <TableLayout><MenuList/>{page}</TableLayout>` (page renders `<MenuItemDetail/>`) |
| `t/[code]/cart/index.tsx` | `page => <TableLayout hideCartBar><Cart/>{page}</TableLayout>` (page renders `null`) |
| `t/[code]/cart/items/[cartItemId].tsx` | `page => <TableLayout hideCartBar><Cart/>{page}</TableLayout>` (page renders `<CartItemEdit/>`) |
| `t/[code]/checkout.tsx` | `page => <TableLayout hideCartBar>{page}</TableLayout>` |

`TableLayout` is the only new component in the app (~25 lines): it reads `code` from
`useRouter().query`, renders `TableResolve`, and is the **same component reference** in all five
files — which is what makes `TableResolve` survive menu → cart → checkout, and `MenuList` survive the
item sheet.

**This is the single highest-risk assumption in the TRD** and phase 2 verifies it by hand before
anything else is built on it (§7, §8/P2).

### D5 — Stay client-rendered; gate on mount and on `router.isReady`

Two Next-specific traps, both from D18's "no SSR" posture:

1. `SessionProvider` constructs `BrowserSessionRepository` during render, which touches
   `document.cookie` and `crypto` — fatal in a server/prerender pass. `_app.tsx` therefore renders
   the provider tree behind a one-line `mounted` gate (`useEffect` → `setMounted(true)`), returning
   `null` on the server. The emitted HTML is an empty shell — **byte-for-byte the same first-paint
   story as today's `index.html`**, and no hydration mismatch is possible.
2. Dynamic pages with no data-fetching method are statically optimised, so `router.query.code` is
   `undefined` on the first render. Without a guard, `TableLayout` would flash the "scan the QR"
   screen before hydration fills the query in. `TableLayout` renders `TableResolve`'s *resolving*
   state until `router.isReady`.

Fixing `SessionProvider` to construct lazily in `libs/ui` was considered; the `_app` gate is chosen
because it is local to the new app and cannot affect the POS or mobile.

### D6 — Keep the `@gatherloop-pos/ui/order` entry point

Its original justification (keep `solito`/`next` out of a Vite build, D20) dissolves — but the
second, larger one does not: the root barrel re-exports every POS composition root, and Next bundles
per page, so importing it would drag the whole POS into the customer's first load and blow the
250 KB gzipped budget in the PRD. The entry point stays; the comments explaining it get rewritten
from "Vite cannot resolve Next" to "the customer bundle does not ship the POS".

### D7 — The navigation port is removed **last**, in its own PR

`libs/ui` cannot import `solito/router` while the Vite app is still deployed (it resolves
`next/router`). So during coexistence the new Next app supplies a 6-line `NavigationProvider` adapter
backed by `next/router`, and the `useNavigation()` port stays exactly as it is. Only after the Vite
app is deleted do the six handlers switch to `useRouter()` from `solito/router` and
`presentation/navigation/` is removed.

This is the change the migration is *for*, and it lands as a clean mechanical diff instead of being
smeared across the risky phases.

### D8 — Configuration moves to `NEXT_PUBLIC_*`, and `libs/api-contract` needs **no** change

`client.ts` already resolves `process.env['NEXT_PUBLIC_API_PROXY_BASE_URL'] ?? __VITE_API_BASE_URL__
?? Config['API_BASE_URL']`. With D13's proxy in place the order app uses that pair exactly as the POS
does — `NEXT_PUBLIC_API_PROXY_BASE_URL=/api` for the browser, `NEXT_PUBLIC_API_BASE_URL` for the
rewrite destination — so the variable means what it says and no file shared with the POS and mobile
is edited.

`Checkout.tsx` gains `process.env.NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED === 'true'`, `||`-ed with the
existing Vite global during coexistence, and the global is deleted in the cleanup phase.

### D9 — Side-by-side migration, not a big bang

The new app is built at `apps/order-next` (Nx project `order-next`) while `apps/order` stays live and
deployed. Nothing user-facing changes until the cutover phase. The final phase deletes `apps/order`
and `git mv apps/order-next apps/order` so the repo, docs and workflows keep the name they have now.

### D10 — React Compiler and Tamagui configuration mirror `apps/web`

`experimental.reactCompiler: true`, the `react/compiler-runtime` → `react-compiler-runtime` webpack
alias (React 18, per `docs/trd-react-compiler-adoption.md` §D3), `withTamagui` with
`outputCSS: './public/tamagui.css'` in production, `cpus: 1` / `workerThreads: false` for the memory
ceiling, and `transpilePackages: ['react-native-qrcode-svg']`. No new build-tooling decisions are
made here; the order app inherits the POS's, which are load-bearing and documented.

The Vite `resolve.alias` stubs for `react-native-reanimated` / `moti/author` are **not** carried over:
they exist because Vite has no `.native.ts` resolution: webpack resolves `libs/ui/src/config.ts` (the
CSS-animation build) for `apps/web` today with no aliases at all.

### D11 — Vite leaves the root workspace entirely

Retiring `apps/order` removes the *reason* Vite is installed, but not Vite itself. A full sweep of
the repo finds four remaining consumers, and they are not equal:

| Consumer | What it is | Disposition |
|---|---|---|
| `apps/order/vite.config.ts` | The app this TRD replaces | Deleted in P7 |
| `apps/mobile/vite.config.ts` | A leftover from the Nx React Native generator — no `project.json` target references it, and every real mobile target is `react-native ...` | Deleted in P10 after confirming `nx show project mobile` lists no Vite-inferred target that anyone uses |
| `libs/ui/.storybook/main.ts` | **The real work.** 150 lines of Vite-specific configuration: `optimizeDeps` include/exclude lists for every `@tamagui/*` package, an esbuild `onResolve` plugin for `@react-native/normalize-colors`, six `resolve.alias` rules mapping `react-native` → `react-native-web`, `react-native-svg` → its web build, and stubs for `solito/*`, `reanimated` and `moti` | Migrated to `@storybook/react-webpack5` in P10 |
| `docs-site/` | VitePress **is** Vite | **Stays.** See below |

**`docs-site` is the one carve-out, and it is not a compromise.** VitePress is a Vite application by
construction; removing Vite there means replacing the documentation site, which has nothing to do
with this migration. It also lives in its **own npm project** (`docs-site/package.json`, its own
lockfile, its own `npm ci` step in CI), so Vite is not a dependency of the root workspace at all —
it is a transitive dependency of a sibling project. After P10, `npm ls vite` at the repo root
returns nothing, and the root `package.json` no longer lists `vite`, `vitest`, `@vitest/ui`,
`@vitejs/plugin-react`, `@tamagui/vite-plugin` or `@nx/vite` (whose plugin entry also comes out of
`nx.json`). No test in the repo uses Vitest — every suite is Jest — so those three drop out unused.

**The Storybook migration is the expensive part and is scoped accordingly.** `@storybook/react-webpack5`
plus `@storybook/addon-react-native-web` is the supported path for `react-native-web` under webpack,
and Tamagui ships `tamagui-loader` for webpack (the same compilation `@tamagui/next-plugin` performs
for `apps/web`), so every Vite-specific rule above has a webpack counterpart. What does not carry
over is the *evidence* — those `optimizeDeps` entries were each written in response to a specific
crash, and webpack will have its own set. P10 therefore has one acceptance test: **every existing
story renders**, verified page by page, with the a11y and interactions addons working. If it turns
out to be more than one PR's worth of work, it splits off into its own TRD without blocking anything
else here — P10 depends on nothing after P7.

### D12 — Verification stays local; this migration adds no CI

The repo runs **no** JavaScript tests in CI: `deploy-api.yml` runs Go lint and tests,
`deploy-pages.yml` only builds. Adding some was considered — both a `lint` + `nx run-many
--target=test` job and a full `e2e-order` job — and neither lands here.

**Why not the e2e job, specifically.** Its value would have been real: the parity contract in §3 —
the menu not remounting behind the item sheet, one table resolve per visit, the cart surviving a
reload — is exactly what the happy-path spec walks, so it is the one thing that could catch a D4
regression without a person remembering to check. But the runtime is dominated by setup, not by the
test: `npm ci`, both `api-contract` generators, a Go build, a MySQL service container, `migrate`,
`make seed`, a Tamagui `next build` (single-threaded by config, D10) and a Playwright browser
install all have to happen before the ~2-minute spec runs at all. That is on the order of ten minutes
of CI on every pull request, and it buys a check that is only ever exercised by the ten PRs in
this plan.

**Why not the lint/unit job either.** Worth having, but it is pre-existing debt rather than migration
work: it would have to start by fixing or quarantining whatever is already red, landing unrelated
work in the critical path of a customer-facing cutover.

**What that costs, stated plainly:** nothing in this plan is verified by a machine. Every phase below
carries its own explicit manual checks, and they are acceptance criteria, not suggestions — most of
all P2's D4 check, which gates the whole routing design. `nx run ui:test` is run locally on the two
phases that touch `libs/ui` (P3 and P8), and the full `order-e2e` suite is run locally before the
cutover phase (P6).

If CI is wanted later, the cheap shape is a **nightly or manually-dispatched** `e2e-order` run rather
than a per-PR one: the same coverage, none of the per-PR wait.

### D13 — API calls go through a same-origin `rewrites()` proxy

Today the browser calls `https://<vps-ip>.sslip.io` directly. Two costs follow from that, and both
exist only because the SPA had no server to hide behind (D18):

- **CORS.** The Go API has to reflect and allow the customer origin, and `EnableCORS` has to allow
  the `X-Session-Id` header (FR-1 in the PRD).
- **A preflight on every cart request.** `X-Session-Id` is a custom header, so the browser sends an
  `OPTIONS` round trip before every `/carts/*` call — the exact requests a guest makes while tapping
  quantities up and down. `sessionInterceptor.ts` already scopes the header to `/carts/*` precisely to
  keep the public catalog GETs out of that penalty; the proxy removes the penalty itself.

The order app now has a server, so it does what the POS does: `next.config.js` declares
`rewrites()` mapping `/api/:path*` to the API, and the browser calls
`https://<app>.vercel.app/api/carts/...` — its own origin. No CORS, no preflight; Vercel forwards
the request server-side. `libs/api-contract`'s axios instance needs no code change, only
`NEXT_PUBLIC_API_PROXY_BASE_URL=/api` (D8).

**What this buys beyond latency:** every Vercel **preview deployment** gets a unique
`*-git-<branch>.vercel.app` hostname. Under direct calls each of those would need adding to
`CORS_ALLOWED_ORIGINS` or preview deploys simply would not work against a real API. Behind the proxy
they all work, unchanged, because the browser never leaves its own origin.

**Consequences, accepted:**

| | |
|---|---|
| Every API call takes an extra hop through Vercel | Adds Vercel-to-VPS latency to each request and consumes Vercel function invocations and bandwidth on whatever plan the project is on. The order app's traffic is a handful of requests per guest per visit, so this is small — but it is now Vercel's meter, not just the VPS's |
| The rewrite destination is baked into the routes manifest at **build** time | Changing the API origin still requires a rebuild, not a restart. D21's "an sslip.io hostname is IP-derived, so a VPS IP change means a redeploy" coupling does not go away — it moves from the client bundle to the build output |
| `gl_session_id` now rides along on API requests | `withCredentials: false` (D22) only governs *cross-origin* requests; same-origin requests always send cookies. So the session cookie is forwarded to the Go API, which ignores it — the session still travels as the `X-Session-Id` header. Harmless, but it is a real change in what the API receives, and it means D22's setting is now inert rather than load-bearing |
| The API sees Vercel's IPs, not guests' | Anything on the VPS that reasons about client IPs (rate limiting, logs) sees the proxy instead. Nothing does today |

**The CORS allowlist is deliberately *not* updated for the order origin** (this drops a step from P5
as originally planned). If someone later reverts to direct calls, it fails loudly in a browser
console rather than silently working in one environment and not another.

---

## 5. Target configuration

### 5.1 App layout

```
apps/order/                          (apps/order-next until the cutover)
├── next.config.js
├── tamagui.config.ts                 # re-export libs/ui config, as apps/web does
├── project.json                      # build/dev dependsOn api-contract:generate:ts
├── tsconfig.json  .eslintrc.json  index.d.ts  next-env.d.ts  .env.example
├── public/favicon.ico                # moved as-is
├── src/components/TableLayout.tsx    # the only new component (§5.4)
└── src/pages/
    ├── _app.tsx                      # Head, providers, mount gate, getLayout, nav adapter
    ├── _document.tsx                 # Tamagui + RNW SSR styles, <Html lang="id">
    ├── global.css                    # html, body, #__next { height:100%; margin:0 }
    ├── index.tsx                     # TableResolve code={null}
    ├── 404.tsx                       # TableResolve code={null}
    └── t/[code]/
        ├── index.tsx
        ├── checkout.tsx
        ├── products/[productId].tsx
        └── cart/
            ├── index.tsx
            └── items/[cartItemId].tsx
```

### 5.2 `next.config.js` (delta from `apps/web`'s)

Same `composePlugins(withNx, withTamagui)` skeleton, same `outputFileTracingRoot`,
`transpilePackages`, `experimental.{cpus, workerThreads, reactCompiler}` and `react/compiler-runtime`
alias — **including the `rewrites()` block**, pointed at the VPS API (D13):

```js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: process.env.NEXT_PUBLIC_API_BASE_URL + '/:path*',
    },
  ];
},
```

### 5.3 `_app.tsx` (shape, not final code)

```tsx
type OrderPage = NextPage & { getLayout?: (page: ReactElement) => ReactNode };

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);       // D5.1
  useEffect(() => setMounted(true), []);

  // D7: the port stays; the Next app is just another adapter behind it.
  const navigation = {
    push: (path: string) => void router.push(path),
    replace: (path: string) => void router.replace(path),
    back: () => router.back(),
  };

  const getLayout = (Component as OrderPage).getLayout ?? ((page) => page);

  return (
    <>
      <Head>
        <title>Gatherloop Order</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RootProvider tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}>
        <NavigationProvider value={navigation}>
          <SessionProvider>
            <CartProvider>
              {mounted ? getLayout(<Component {...pageProps} />) : null}
            </CartProvider>
          </SessionProvider>
        </NavigationProvider>
      </RootProvider>
    </>
  );
}
```

`disableInjectCSS: true` because `_document.tsx` injects the Tamagui CSS; `defaultTheme: 'light'`
because the Vite app mounts `RootProvider` bare and gets the config's first theme — no
`NextThemeProvider` here, unlike the POS, since the customer app has no theme switch.

### 5.4 `TableLayout` (the whole of D4)

```tsx
export const TableLayout = ({ children, hideCartBar }: TableLayoutProps) => {
  const router = useRouter();

  // D5.2 — on a statically optimised dynamic page `query` is empty until
  // hydration. Rendering TableResolve with a null code here would flash the
  // "scan the QR at your table" screen before the code arrives.
  if (!router.isReady) {
    return (
      <OrderLayout>
        <LoadingView title="Memuat meja..." />
      </OrderLayout>
    );
  }

  const code = typeof router.query.code === 'string' ? router.query.code : null;
  return (
    <TableResolve code={code} hideCartBar={hideCartBar}>
      {children}
    </TableResolve>
  );
};
```

The pre-`isReady` branch reproduces `TableResolveScreen`'s own `resolving` variant exactly (same
`OrderLayout` + `LoadingView title="Memuat meja..."`), so the transition into the resolved screen is
invisible. P2 may instead add a `loading` prop to `TableResolve` if duplicating those two elements in
the app shell reads worse — either way, `TableResolve` must never be handed `code: null` before the
router is ready.

### 5.5 Environment variables

| Variable | Where | Value | Replaces |
|---|---|---|---|
| `NEXT_PUBLIC_API_PROXY_BASE_URL` | order app (browser) | `/api` | `VITE_API_BASE_URL` |
| `NEXT_PUBLIC_API_BASE_URL` | order app (rewrite destination, D13) | `https://<vps-ip>.sslip.io` | — |
| `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` | order app | `true` / unset | `VITE_ORDER_CHECKOUT_ENABLED` |
| `NEXT_PUBLIC_ORDER_APP_BASE_URL` | **POS** (`apps/web`) | `https://<order-host>` | hardcoded string in `tableOrderUrl.ts` |

### 5.6 What gets deleted at the end

**The app (P7):** `apps/order/index.html`, `src/main.tsx`, `src/app/app.tsx`, `src/router/**`,
`src/styles.css`, `vite.config.ts`; the `?redirect=` restoration; the `dist/order/404.html` copy step
and the order build steps in `.github/workflows/deploy-pages.yml`.

**The shared-library workarounds (P7, P8):** `libs/ui/src/presentation/navigation/**` + its
`index.order.ts` export; `__VITE_API_BASE_URL__` in `libs/api-contract/src/client.ts`;
`__VITE_ORDER_CHECKOUT_ENABLED__` in `libs/ui/src/app/Checkout.tsx`.

**Vite itself (P10, D11):** `apps/mobile/vite.config.ts`; `vite`, `vitest`, `@vitest/ui`,
`@vitejs/plugin-react`, `@tamagui/vite-plugin` and `@nx/vite` from the root `package.json`; the
`@nx/vite` plugin entry in `nx.json`; `libs/ui/.storybook/main.ts`'s `viteFinal` block, replaced by
its webpack equivalent.

---

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **D4's layout preservation doesn't hold** — the menu remounts behind the item sheet, losing scroll/search | Low, high impact | P2 verifies it by hand (scroll the menu, open an item, close it) *before* P3 builds on it. Fallback: a single catch-all `pages/t/[[...slug]].tsx` that dispatches internally — parity is preserved, framework-idiomatic routing is not |
| First-load JS exceeds the PRD's 250 KB gz budget | Medium | Measure `next build`'s First Load JS in P2 and P3 and record it in the PR. The order entry point (D6) already excludes the POS; if it is still over, the gap is Tamagui/RN-web, identical to what the POS ships |
| Vercel monorepo build wiring (Nx + the `@nx-go/nx-go` graph plugin needing a `go` binary — see `vercel.json` and commit `fcb97e8`) | Medium | P5 is a standalone phase whose only deliverable is a green deploy; reuse the POS's `buildCommand` shape verbatim |
| Origin change resets in-flight guests' carts (`gl_session_id` is per-origin) | High, low impact | Cut over outside service hours. Carts are ephemeral by design (D3 in the PRD) |
| A printed QR code stops working | Low, **very** high impact | The Pages shim (D3) is deployed and smoke-tested in P6 **before** `deploy-pages.yml` stops publishing the SPA; the shim is permanent, not transitional |
| API CORS rejects the new origin | **Eliminated** | Not a risk any more: behind D13's proxy the browser never calls the API cross-origin, so `CORS_ALLOWED_ORIGINS` is not consulted and is deliberately left untouched |
| Hydration mismatch from `react-native-web` | Low | D5's mount gate means the server emits an empty shell — there is nothing to mismatch |
| **Storybook loses stories in the webpack migration** (D11) — the Vite config encodes a dozen hard-won fixes for RN-web/Tamagui/esbuild, and webpack will fail differently | Medium, contained | P10 depends on nothing else and blocks nothing; its acceptance test is every story rendering, checked page by page. If it grows past one PR it becomes its own TRD. Storybook is a development surface — a delay there costs no customer anything |
| **No phase has an automated check** — the repo has no JS CI and this migration adds none (D12), so a regression in `libs/ui` or the new app can ride to the next phase unnoticed | Medium | Every phase below states its own manual checks, and they are acceptance criteria, not suggestions. `nx run ui:test` locally on the phases that touch `libs/ui` (P3, P8); the full `order-e2e` suite locally before the cutover (P6) |
| The proxy (D13) puts Vercel on the request path for **every** API call — an outage or plan limit there now breaks ordering, where before only the static shell depended on Vercel | Low, high impact | The VPS API stays directly reachable, so the fallback is one env var (`NEXT_PUBLIC_API_PROXY_BASE_URL` back to the API origin) plus adding the origin to `CORS_ALLOWED_ORIGINS` — keep that pair written down in the runbook, since the allowlist entry is deliberately absent (D13) |
| A misconfigured rewrite destination fails at **runtime**, not build time — `next build` succeeds with a wrong or empty `NEXT_PUBLIC_API_BASE_URL` and every API call 404s | Medium | P1's verification includes hitting a proxied endpoint, and the e2e suite (P4) exercises the real path end to end |

---

## 7. Phases

Each phase is one PR. Every phase before P6 leaves the live GitHub Pages app untouched and working.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P1 | `chore(order-next): scaffold the Next.js customer app` | — | M |
| P2 | `feat(order-next): table shell and menu routes` | P1 | M |
| P3 | `feat(order-next): cart, cart item edit and checkout routes` | P2 | M |
| P4 | `test(order-e2e): run the happy path against the Next app` | P3 | S |
| P5 | `chore(order-next): Vercel project, env and CORS` | P4 | S |
| P6 | `feat: cut QR codes over to the Next order app` | P5 | M |
| P7 | `chore(order): delete the Vite app and its escape hatches` | P6 | M |
| P8 | `refactor(ui): drop the navigation port for solito/router` | P7 | M |
| P9 | `docs: refresh the order app's architecture notes` | P8 | S |
| P10 | `chore: remove Vite from the workspace` | P7 | L |

P10 is the only one that can move: it needs the Vite app gone (P7) and nothing needs it.
Everything else is a straight line.

### P1 — Scaffold the Next.js customer app

**Adds** `apps/order-next/` per §5.1: `next.config.js` (§5.2), `tamagui.config.ts`, `project.json`
(with `build`/`dev` `dependsOn` `api-contract:generate:ts`, as `apps/web` has), `tsconfig.json`,
`.eslintrc.json` (extends `next` + `next/core-web-vitals`), `.env.example`, `index.d.ts`,
`public/favicon.ico`, `src/pages/{_app,_document,index,404}.tsx`, `src/pages/global.css`.

`index.tsx` and `404.tsx` both render `<TableResolve code={null} />` — the "scan the QR at your
table" screen. `_app.tsx` is §5.3 including the navigation adapter (D7) and the mount gate (D5).

**Touches no existing file.**

**Verify:** `nx run order-next:dev` serves the scan-QR screen at `/` and at an unknown path, styled,
phone-width, in Bahasa Indonesia; `nx run order-next:build` succeeds and the production build renders
identically (this is what proves the `_document` Tamagui CSS wiring); **`curl localhost:3000/api/public/categories`
returns the API's response**, proving D13's rewrite resolves (a wrong destination fails here, not at
build time); `nx run order:build` (Vite) still succeeds.

### P2 — Table shell and menu routes

**Adds** `src/components/TableLayout.tsx` (§5.4), `src/pages/t/[code]/index.tsx` and
`src/pages/t/[code]/products/[productId].tsx`, both exporting the same `getLayout` (D4).

**Verify, against a locally seeded table code:**
1. `/t/{code}` renders the menu; search and category chips work.
2. Deep-link (hard navigation) straight to `/t/{code}/products/{id}` opens the sheet over the menu.
3. **The D4 check:** scroll the menu, type a search term, open an item, close it (both the sheet's
   close button and browser Back) — scroll position, search text and selected category are all
   preserved, and the menu does **not** re-fetch (Network tab).
4. `/t/` with a garbage code shows "QR tidak valid"; there is no "scan the QR" flash first (D5.2).
5. Record `next build`'s First Load JS for `/t/[code]` in the PR description.

If check 3 fails, stop and take D4's fallback before writing P3.

### P3 — Cart, cart item edit and checkout routes

**Adds** `src/pages/t/[code]/cart/index.tsx`, `src/pages/t/[code]/cart/items/[cartItemId].tsx`,
`src/pages/t/[code]/checkout.tsx`.
**Touches** `libs/ui/src/app/Checkout.tsx`: read `process.env.NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED ===
'true' || (__VITE_ORDER_CHECKOUT_ENABLED__ ?? false)` so both apps keep working (D8).

**Verify:** add to cart from the sheet → the floating bar appears → cart screen lists the line →
quantity edit, note edit via the modal, remove, clear-all confirmation → checkout shows the QRIS stub
with the flag on and the "not available" copy with it off → Back from checkout returns to the cart.
Moving menu → cart → checkout shows **no** "Memuat meja…" flash (parity item 3). Reloading `/t/{code}/cart`
restores the same cart (session cookie).

### P4 — Run the happy path against the Next app

**Adds** `apps/order-next-e2e/` — a Playwright project whose config points `testDir` at
`../order-e2e/src` (the specs are shared verbatim, so the suite cannot drift) with
`webServer: npx nx run order-next:build && npx nx run order-next:start`, `baseURL`
`http://localhost:3000/`, and `NEXT_PUBLIC_*` env in place of `VITE_*` —
`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` for the rewrite, `NEXT_PUBLIC_API_PROXY_BASE_URL=/api`
for the browser (D13). The seeding helpers in `utils/api.ts` keep talking to the API directly on
`API_BASE_URL`: they are staff-authenticated Node calls, not browser traffic, so the proxy is
irrelevant to them.
**Touches** `apps/order-e2e/src/table-ordering.spec.ts`: the one assertion that reads
`dist/order/404.html` off disk moves into its own Vite-only spec file (deleted in P7); the deep-link
*behaviour* test stays shared and additionally asserts an HTTP 200 on the Next target.

**Verify:** both suites green — `nx run order-e2e:e2e` (Vite) and `nx run order-next-e2e:e2e` (Next) —
against a locally running API.

### P5 — Vercel project, env and CORS

**Ops, plus a small config file.** Create the Vercel project for `apps/order-next` on its
Vercel-assigned `*.vercel.app` host (mirroring the POS project's monorepo build command, including
the Go toolchain step the Nx graph needs) and set `NEXT_PUBLIC_API_BASE_URL`,
`NEXT_PUBLIC_API_PROXY_BASE_URL` and `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`.

**No CORS change is needed, and none is made** (D13): the browser only ever calls the deployment's own
origin. That is also what makes the preview deployment below work without touching the VPS at all.

**Verify:** the production deployment serves `/t/{code}` for a real table code and adds an item to a
cart; in the network panel every API request goes to `<host>/api/...` and returns 200, and **there is
no `OPTIONS` preflight** before the cart mutation — that absence is the proof D13 landed. Confirm the
same on a preview deployment from a branch. The GitHub Pages app is still live and untouched; nothing
points customers at the new host yet.

### P6 — Cut QR codes over to the Next order app

**Touches**
- `libs/ui/src/utils/tableOrderUrl.ts` → `NEXT_PUBLIC_ORDER_APP_BASE_URL` (D3), plus the POS's env
  files and Vercel env.
- `docs-site/.vitepress/config.ts` → the 404 script redirects `/gatherloop-pos/order/**` to
  `https://<order-host>/**` instead of bouncing into the SPA, and a static `order/index.html`
  redirects the bare path.
- `.github/workflows/deploy-pages.yml` → drop the order build, the `VITE_*` env and the
  `404.html` copy; keep the docs-site build and the shim.

**Verify, in this order:** deploy the docs-site shim → scan an **already-printed** QR code on a phone
and land on the new host with the right table → print a new QR from the POS and confirm it encodes the
new origin → only then merge the workflow change that stops publishing the SPA.

### P7 — Delete the Vite app and its escape hatches

**Deletes** `apps/order/`, `apps/order-e2e/`'s Vite-only spec and config; **renames**
`apps/order-next` → `apps/order` and `order-next-e2e` → `order-e2e` (`git mv` + project names +
`tsconfig` references + Playwright config + README + `docs-site/sales/table-ordering.md`).
**Removes** `__VITE_API_BASE_URL__` from `libs/api-contract/src/client.ts` and
`__VITE_ORDER_CHECKOUT_ENABLED__` from `libs/ui/src/app/Checkout.tsx`.

Mechanical; review as a rename. **Verify:** `nx run order:build`, `nx run order:e2e`, `nx run-many
--target=test --all`, and a Vercel preview deploy from the renamed path.

### P8 — Drop the navigation port for `solito/router`

**Touches** `MenuListHandler`, `MenuItemDetailHandler`, `CartHandler`, `CheckoutHandler`,
`app/TableResolve.tsx`, `app/CartItemEdit.tsx`: `useNavigation()` → `useRouter()` from
`solito/router`. Path strings are unchanged (D3). **Deletes**
`libs/ui/src/presentation/navigation/**`, its `index.order.ts` export and the adapter in `_app.tsx`.
**Updates** the six handler tests to `jest.mock('solito/router')` — the pattern
`AuthLoginHandler.test.tsx` already uses, with the mock already wired in `libs/ui/jest.config.ts`.

**Verify:** `nx run ui:test` green; `nx run order:e2e` green. **This phase is the goal of the TRD** —
after it, `libs/ui` has exactly one routing dependency.

### P9 — Refresh the architecture notes

`README.md` ("standalone static React + Vite SPA…"), `docs-site/sales/table-ordering.md`, and the
D18/D19/D20 rows of `docs/prd-table-ordering.md` annotated as superseded by this TRD. The seventeen
"deep imports, not the root barrels — a Vite build has no business resolving Next" comments in
`libs/ui` get rewritten to the bundle-size rationale (D6).

### P10 — Remove Vite from the workspace

Everything in D11 that is not the order app itself:

1. Delete `apps/mobile/vite.config.ts` after confirming no target uses it (`nx show project mobile`).
2. Migrate `libs/ui/.storybook` from `@storybook/react-vite` to `@storybook/react-webpack5` +
   `@storybook/addon-react-native-web`, re-expressing the `resolve.alias` rules as webpack `alias`
   entries and replacing `@vitejs/plugin-react` + `babel-plugin-react-compiler` with `babel-loader`
   carrying the same compiler plugin (`target: '18'`). Tamagui compilation moves to `tamagui-loader`.
   The `optimizeDeps` block has no counterpart — webpack has no pre-bundler — and simply goes away.
3. Drop `vite`, `vitest`, `@vitest/ui`, `@vitejs/plugin-react`, `@tamagui/vite-plugin` and `@nx/vite`
   from the root `package.json`, and the `@nx/vite` plugin entry from `nx.json`.

**Verify:** `nx run ui:storybook` and `nx run ui:build-storybook` succeed; **every story renders**,
walked page by page, in both light and dark, with the a11y and interactions addons live; `npm ls vite`
at the repo root returns empty. `docs-site` keeps VitePress and its own lockfile, untouched (D11).

**Split it if it fights back.** Step 2 is the only unbounded piece; steps 1 and 3 are minutes of work
and can ship as their own PR the moment step 2 is done. Nothing else in this plan depends on P10.

---

## 8. How we will know it worked

| Signal | Target |
|---|---|
| `order-e2e` happy path against the Next build | Green, including the deep-link test at HTTP 200 |
| Menu ↔ item sheet | Scroll, search and category preserved; no menu re-fetch (D4) |
| Table resolve requests per visit | Exactly one `GET /public/tables/{code}` across menu → cart → checkout |
| First Load JS for `/t/[code]` | Recorded in P2/P3; ≤ 250 KB gz, or an explicit written waiver |
| Old printed QR code | Lands on the new host with the correct table, one redirect hop |
| `libs/ui` routing dependencies | One (`solito/router`); `presentation/navigation/` gone |
| Lines of routing code in `apps/order` | 0 (from 103) |
| `__VITE_*` globals in shared libs | 0 (from 2) |
| `OPTIONS` preflights on cart mutations | 0 (from 1 per request) — every API call is same-origin (D13) |
| `CORS_ALLOWED_ORIGINS` on the VPS | Unchanged; a preview deployment works against the real API without touching it |
| `npm ls vite` at the repo root | Empty (`docs-site` keeps VitePress in its own project — D11) |
| Every Storybook story | Renders under the webpack builder, light and dark |

---

## 9. Decisions taken and what is still open

**Settled (2026-08-25):**

| Question | Answer | Where it lives |
|---|---|---|
| Hostname | The Vercel-assigned `*.vercel.app` host; no custom domain for now, and the host stays in an env var so adopting one later is a config change | D2, §5.5 |
| Keep an `/order` path segment? | No. The app owns the root of its host: `https://<app>.vercel.app/t/{code}` | D3 |
| Same-origin API proxy | **Included in this migration.** `rewrites()` maps `/api/*` to the VPS, so the browser never leaves its own origin: no CORS, no per-cart preflight, and preview deployments work against the real API. Cost: Vercel is on the path for every API call, and the destination is baked at build time | D13, §5.2, §5.5 |
| JS CI | None is added. A per-PR e2e job costs ~10 minutes of setup for a check only these ten PRs exercise, and a lint/unit job is pre-existing debt rather than migration work. Verification is the per-phase manual checks, local test runs and Vercel previews | D12 |
| Vite | Leaves the root workspace entirely, Storybook included; `docs-site`'s VitePress is the one carve-out and lives in a separate npm project | D11, P10 |

**Still open:**

1. **JS CI, eventually.** Not part of this migration (D12), but the order happy path is worth
   running automatically once it is not costing a wait on every PR — a nightly or
   `workflow_dispatch` job is the shape to reach for.
2. **Whether P10 stays one PR.** The Storybook builder swap is the only unbounded piece of work in
   this plan. If step 2 of P10 runs long, it becomes its own TRD — nothing depends on it.
3. **Whether D22 (`withCredentials: false`) still earns its place.** Behind the proxy it governs
   nothing — same-origin requests send cookies regardless (D13) — so the order app's session cookie
   now reaches the API even though the session travels as a header. Harmless today; worth a decision
   if the API ever starts reading cookies on public routes.

---

## References

- `docs/prd-table-ordering.md` — D3, D10, D14, D17–D22 (the decisions this TRD revisits)
- `docs/prd-order-app-ux-improvements.md` — FR-1 (pinned footer), FR-9 (cart item edit modal)
- `docs/trd-react-compiler-adoption.md` — §D3 (`react/compiler-runtime` alias on React 18), §5.3–5.4
- `apps/web/next.config.js`, `apps/web/src/pages/_app.tsx`, `apps/web/src/pages/_document.tsx` — the
  Tamagui-on-Next configuration this app inherits
- `apps/order/src/app/app.tsx` — the route table §2.2 is derived from
- Next.js Pages Router: [Layouts](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts#layout-pattern),
  [Automatic Static Optimization](https://nextjs.org/docs/pages/building-your-application/rendering/automatic-static-optimization)
