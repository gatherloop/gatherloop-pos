# TRD — Migrating `apps/order` from Vite SPA to Next.js

**Status:** proposed
**Scope:** `apps/order`, `apps/order-e2e`, `libs/ui` (order slices + navigation port), `libs/api-contract` (base-URL resolution), `docs-site` (`/order` path), `.github/workflows/deploy-pages.yml`, hosting
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

### 2.3 Runtime posture (all of it stays)

- **No SSR.** Every usecase starts `idle` and fetches after mount (D18). First paint is the shell +
  skeletons.
- **Anonymous session.** `BrowserSessionRepository` mints a UUIDv4 **during construction**, reading
  `document.cookie`, `window.localStorage` and `crypto.randomUUID()` — i.e. it is constructed inside
  `useState(() => …)` in `SessionProvider` and **cannot run during a server render**.
- **Direct, cross-origin API calls** to `https://<vps-ip>.sslip.io` with `withCredentials: false` and
  an `X-Session-Id` header scoped to `/carts/*` (D21/D22).
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

**Not in scope: a same-origin API proxy.** Today the browser calls the API at a *different* origin
(`https://<vps-ip>.sslip.io`), so the Go API has to grant CORS permission, and the `X-Session-Id`
header on `/carts/*` makes the browser send an extra `OPTIONS` "preflight" request before each cart
call — two round trips instead of one. Now that the order app has a server, `next.config.js` could
declare `rewrites()` mapping `/api/*` to the VPS, exactly as the POS does: the page would call
`https://<app>.vercel.app/api/carts/...`, the same origin it was served from, so no CORS and no
preflight — Vercel forwards the request server-side. The cost is an extra network hop through Vercel
on every API call, plus Vercel function/bandwidth usage. **Deliberately deferred:** it changes the
runtime posture (D21/D22) rather than the framework, and it can be adopted later as a self-contained
change to one config file and one environment variable. Revisit if preflight latency shows up in the
field.

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
?? Config['API_BASE_URL']`. The order app sets `NEXT_PUBLIC_API_PROXY_BASE_URL` to the API origin and
falls straight into the first branch — no edit to a file shared with the POS and mobile.

The name is a small lie for this app (nothing is proxied), and it is deliberately tolerated: the POS
sets `NEXT_PUBLIC_API_BASE_URL` to its *rewrite destination*, so teaching `client.ts` to read that
variable would silently make the POS bypass its own proxy. Renaming the variable across both apps is
a separate, optional cleanup.

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
| `apps/order/vite.config.ts` | The app this TRD replaces | Deleted in P8 |
| `apps/mobile/vite.config.ts` | A leftover from the Nx React Native generator — no `project.json` target references it, and every real mobile target is `react-native ...` | Deleted in P11 after confirming `nx show project mobile` lists no Vite-inferred target that anyone uses |
| `libs/ui/.storybook/main.ts` | **The real work.** 150 lines of Vite-specific configuration: `optimizeDeps` include/exclude lists for every `@tamagui/*` package, an esbuild `onResolve` plugin for `@react-native/normalize-colors`, six `resolve.alias` rules mapping `react-native` → `react-native-web`, `react-native-svg` → its web build, and stubs for `solito/*`, `reanimated` and `moti` | Migrated to `@storybook/react-webpack5` in P11 |
| `docs-site/` | VitePress **is** Vite | **Stays.** See below |

**`docs-site` is the one carve-out, and it is not a compromise.** VitePress is a Vite application by
construction; removing Vite there means replacing the documentation site, which has nothing to do
with this migration. It also lives in its **own npm project** (`docs-site/package.json`, its own
lockfile, its own `npm ci` step in CI), so Vite is not a dependency of the root workspace at all —
it is a transitive dependency of a sibling project. After P11, `npm ls vite` at the repo root
returns nothing, and the root `package.json` no longer lists `vite`, `vitest`, `@vitest/ui`,
`@vitejs/plugin-react`, `@tamagui/vite-plugin` or `@nx/vite` (whose plugin entry also comes out of
`nx.json`). No test in the repo uses Vitest — every suite is Jest — so those three drop out unused.

**The Storybook migration is the expensive part and is scoped accordingly.** `@storybook/react-webpack5`
plus `@storybook/addon-react-native-web` is the supported path for `react-native-web` under webpack,
and Tamagui ships `tamagui-loader` for webpack (the same compilation `@tamagui/next-plugin` performs
for `apps/web`), so every Vite-specific rule above has a webpack counterpart. What does not carry
over is the *evidence* — those `optimizeDeps` entries were each written in response to a specific
crash, and webpack will have its own set. P11 therefore has one acceptance test: **every existing
story renders**, verified page by page, with the a11y and interactions addons working. If it turns
out to be more than one PR's worth of work, it splits off into its own TRD without blocking anything
else here — P11 depends on nothing after P8.

### D12 — Add JS CI before the migration starts, not after

The repo currently runs **no** JavaScript tests in CI: `deploy-api.yml` runs Go lint and tests,
`deploy-pages.yml` only builds. Every phase in this plan is verified by hand today, which is exactly
the wrong footing for a twelve-PR migration that touches a shared library.

CI lands **first**, as P0, so every phase after it is checked automatically:

- **`ci.yml`, job `test`** — on every pull request and push to `main`: `npm ci`, `nx run
  api-contract:generate:ts` (`src/__generated__` is gitignored, so nothing compiles without it),
  then `nx run-many --target=lint --all` and `nx run-many --target=test --all --passWithNoTests`.
  Needs `actions/setup-go` even though no Go is compiled: the `@nx-go/nx-go` plugin shells out to
  `go` while building the project graph, which is the same reason `vercel.json` installs a Go
  toolchain before `nx run web:build` (commit `fcb97e8`).
- **`ci.yml`, job `e2e-order`** — lands as P5, once there is a Next app to run it against. Heavier:
  a MySQL service container, the `migrate` CLI against `apps/api/migrations`, `make -C apps/api seed`
  for the staff user `apps/order-e2e/src/utils/api.ts` logs in as, `go run` the API on `:8080`, then
  `nx run order-e2e:e2e`. It is the only thing that can catch a D4 regression automatically, so it
  is worth the setup — but it is a separate job and a separate PR, and a red `e2e-order` must not be
  the thing that teaches us the MySQL wiring is flaky. Start it as non-blocking; promote it to
  required once it has been green for a week.

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
alias. **Removed:** the `rewrites()` block (D2 — the order app calls the API directly).

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
| `NEXT_PUBLIC_API_PROXY_BASE_URL` | order app | `https://<vps-ip>.sslip.io` | `VITE_API_BASE_URL` |
| `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED` | order app | `true` / unset | `VITE_ORDER_CHECKOUT_ENABLED` |
| `NEXT_PUBLIC_ORDER_APP_BASE_URL` | **POS** (`apps/web`) | `https://<order-host>` | hardcoded string in `tableOrderUrl.ts` |

### 5.6 What gets deleted at the end

**The app (P8):** `apps/order/index.html`, `src/main.tsx`, `src/app/app.tsx`, `src/router/**`,
`src/styles.css`, `vite.config.ts`; the `?redirect=` restoration; the `dist/order/404.html` copy step
and the order build steps in `.github/workflows/deploy-pages.yml`.

**The shared-library workarounds (P8, P9):** `libs/ui/src/presentation/navigation/**` + its
`index.order.ts` export; `__VITE_API_BASE_URL__` in `libs/api-contract/src/client.ts`;
`__VITE_ORDER_CHECKOUT_ENABLED__` in `libs/ui/src/app/Checkout.tsx`.

**Vite itself (P11, D11):** `apps/mobile/vite.config.ts`; `vite`, `vitest`, `@vitest/ui`,
`@vitejs/plugin-react`, `@tamagui/vite-plugin` and `@nx/vite` from the root `package.json`; the
`@nx/vite` plugin entry in `nx.json`; `libs/ui/.storybook/main.ts`'s `viteFinal` block, replaced by
its webpack equivalent.

---

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **D4's layout preservation doesn't hold** — the menu remounts behind the item sheet, losing scroll/search | Low, high impact | P2 verifies it by hand (scroll the menu, open an item, close it) *before* P3 builds on it. Fallback: a single catch-all `pages/t/[[...slug]].tsx` that dispatches internally — parity is preserved, framework-idiomatic routing is not |
| First-load JS exceeds the PRD's 250 KB gz budget | Medium | Measure `next build`'s First Load JS in P2 and P3 and record it in the PR. The order entry point (D6) already excludes the POS; if it is still over, the gap is Tamagui/RN-web, identical to what the POS ships |
| Vercel monorepo build wiring (Nx + the `@nx-go/nx-go` graph plugin needing a `go` binary — see `vercel.json` and commit `fcb97e8`) | Medium | P6 is a standalone phase whose only deliverable is a green deploy; reuse the POS's `buildCommand` shape verbatim |
| Origin change resets in-flight guests' carts (`gl_session_id` is per-origin) | High, low impact | Cut over outside service hours. Carts are ephemeral by design (D3 in the PRD) |
| A printed QR code stops working | Low, **very** high impact | The Pages shim (D3) is deployed and smoke-tested in P7 **before** `deploy-pages.yml` stops publishing the SPA; the shim is permanent, not transitional |
| API CORS rejects the new origin | Medium, high impact | `CORS_ALLOWED_ORIGINS` on the VPS is updated in P6, one phase before any customer traffic reaches the new host |
| Hydration mismatch from `react-native-web` | Low | D5's mount gate means the server emits an empty shell — there is nothing to mismatch |
| **Storybook loses stories in the webpack migration** (D11) — the Vite config encodes a dozen hard-won fixes for RN-web/Tamagui/esbuild, and webpack will fail differently | Medium, contained | P11 depends on nothing else and blocks nothing; its acceptance test is every story rendering, checked page by page. If it grows past one PR it becomes its own TRD. Storybook is a development surface — a delay there costs no customer anything |
| `e2e-order` CI job is flaky (MySQL service, migrations, seeds, a real Go API) | Medium | Land it non-blocking (D12) and promote it to required only after a week green |

---

## 7. Phases

Each phase is one PR. Every phase before P7 leaves the live GitHub Pages app untouched and working.

| # | PR title | Depends on | Size |
|---|---|---|---|
| P0 | `ci: lint and unit tests on pull requests` | — | S |
| P1 | `chore(order-next): scaffold the Next.js customer app` | P0 | M |
| P2 | `feat(order-next): table shell and menu routes` | P1 | M |
| P3 | `feat(order-next): cart, cart item edit and checkout routes` | P2 | M |
| P4 | `test(order-e2e): run the happy path against the Next app` | P3 | S |
| P5 | `ci: order e2e job` | P4 | M |
| P6 | `chore(order-next): Vercel project, env and CORS` | P4 | S |
| P7 | `feat: cut QR codes over to the Next order app` | P6 | M |
| P8 | `chore(order): delete the Vite app and its escape hatches` | P7 | M |
| P9 | `refactor(ui): drop the navigation port for solito/router` | P8 | M |
| P10 | `docs: refresh the order app's architecture notes` | P9 | S |
| P11 | `chore: remove Vite from the workspace` | P8 | L |

P5 and P11 are the two that can move: P5 can land any time after P4 (or earlier, as a Vite-target
job), and P11 only needs the Vite app gone (P8). Everything else is a straight line.

### P0 — Lint and unit tests on pull requests

**Adds** `.github/workflows/ci.yml` with a single `test` job per D12: `pull_request` + `push` to
`main`, Node 20 + Go (for the Nx graph), `npm ci`, `nx run api-contract:generate:ts`,
`nx run-many --target=lint --all`, `nx run-many --target=test --all --passWithNoTests`.

**Verify:** the job is green on its own PR, and deliberately red when a test is broken in a scratch
commit. Fix or explicitly quarantine anything already failing — this is the baseline every later
phase is measured against, so it has to start green.

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
identically (this is what proves the `_document` Tamagui CSS wiring); `nx run order:build` (Vite)
still succeeds.

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
`http://localhost:3000/`, and `NEXT_PUBLIC_*` env in place of `VITE_*`.
**Touches** `apps/order-e2e/src/table-ordering.spec.ts`: the one assertion that reads
`dist/order/404.html` off disk moves into its own Vite-only spec file (deleted in P8); the deep-link
*behaviour* test stays shared and additionally asserts an HTTP 200 on the Next target.

**Verify:** both suites green — `nx run order-e2e:e2e` (Vite) and `nx run order-next-e2e:e2e` (Next) —
against a locally running API.

### P5 — Order e2e job in CI

**Touches** `.github/workflows/ci.yml`: adds the `e2e-order` job described in D12 — MySQL service
container, `migrate` against `apps/api/migrations`, `make -C apps/api seed`, the API on `:8080`,
Playwright against `order-next-e2e`. Uploads the Playwright report on failure. **Non-blocking**
(`continue-on-error`) until it has a week of green runs.

**Verify:** the job passes on its own PR and on a re-run (the same seeded catalog is created per run
with a `Date.now()` suffix, so reruns must not collide). This is the phase that makes a D4 regression
catchable by a machine rather than by memory.

### P6 — Vercel project, env and CORS

**Ops, plus a small config file.** Create the Vercel project for `apps/order-next` on its
Vercel-assigned `*.vercel.app` host (mirroring the POS project's monorepo build command, including
the Go toolchain step the Nx graph needs), set
`NEXT_PUBLIC_API_PROXY_BASE_URL` and `NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED`, and **add the new origin
to `CORS_ALLOWED_ORIGINS`** on the VPS (GitHub environment secret + redeploy of `apps/api`).

**Verify:** the production deployment of the new host serves `/t/{code}` for a real table code, adds
an item to a cart, and shows no CORS error in the console. The GitHub Pages app is still live and
untouched; nothing points customers at the new host yet.

### P7 — Cut QR codes over to the Next order app

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

### P8 — Delete the Vite app and its escape hatches

**Deletes** `apps/order/`, `apps/order-e2e/`'s Vite-only spec and config; **renames**
`apps/order-next` → `apps/order` and `order-next-e2e` → `order-e2e` (`git mv` + project names +
`tsconfig` references + Playwright config + README + `docs-site/sales/table-ordering.md`).
**Removes** `__VITE_API_BASE_URL__` from `libs/api-contract/src/client.ts` and
`__VITE_ORDER_CHECKOUT_ENABLED__` from `libs/ui/src/app/Checkout.tsx`.

Mechanical; review as a rename. **Verify:** `nx run order:build`, `nx run order:e2e`, `nx run-many
--target=test --all`, and a Vercel preview deploy from the renamed path.

### P9 — Drop the navigation port for `solito/router`

**Touches** `MenuListHandler`, `MenuItemDetailHandler`, `CartHandler`, `CheckoutHandler`,
`app/TableResolve.tsx`, `app/CartItemEdit.tsx`: `useNavigation()` → `useRouter()` from
`solito/router`. Path strings are unchanged (D3). **Deletes**
`libs/ui/src/presentation/navigation/**`, its `index.order.ts` export and the adapter in `_app.tsx`.
**Updates** the six handler tests to `jest.mock('solito/router')` — the pattern
`AuthLoginHandler.test.tsx` already uses, with the mock already wired in `libs/ui/jest.config.ts`.

**Verify:** `nx run ui:test` green; `nx run order:e2e` green. **This phase is the goal of the TRD** —
after it, `libs/ui` has exactly one routing dependency.

### P10 — Refresh the architecture notes

`README.md` ("standalone static React + Vite SPA…"), `docs-site/sales/table-ordering.md`, and the
D18/D19/D20 rows of `docs/prd-table-ordering.md` annotated as superseded by this TRD. The seventeen
"deep imports, not the root barrels — a Vite build has no business resolving Next" comments in
`libs/ui` get rewritten to the bundle-size rationale (D6).

### P11 — Remove Vite from the workspace

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
and can ship as their own PR the moment step 2 is done. Nothing else in this plan depends on P11.

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
| JS tests in CI | `nx run-many --target=test --all` green on every PR (from: no JS CI at all) |
| `npm ls vite` at the repo root | Empty (`docs-site` keeps VitePress in its own project — D11) |
| Every Storybook story | Renders under the webpack builder, light and dark |

---

## 9. Decisions taken and what is still open

**Settled (2026-08-25):**

| Question | Answer | Where it lives |
|---|---|---|
| Hostname | The Vercel-assigned `*.vercel.app` host; no custom domain for now, and the host stays in an env var so adopting one later is a config change | D2, §5.5 |
| Keep an `/order` path segment? | No. The app owns the root of its host: `https://<app>.vercel.app/t/{code}` | D3 |
| Same-origin API proxy | Deferred, not rejected — it removes CORS and the per-cart-request preflight, at the cost of an extra hop through Vercel. Adoptable later as one config file plus one env var | D2 |
| JS CI | Added, and added **first** so the migration itself is the first thing it protects: lint + unit tests in P0, order e2e in P5 | D12, P0, P5 |
| Vite | Leaves the root workspace entirely, Storybook included; `docs-site`'s VitePress is the one carve-out and lives in a separate npm project | D11, P11 |

**Still open:**

1. **When to promote `e2e-order` to a required check.** D12 says "a week green"; that is a guess, not
   a measurement. Revisit once there is a failure history to read.
2. **Whether P11 stays one PR.** The Storybook builder swap is the only unbounded piece of work in
   this plan. If step 2 of P11 runs long, it becomes its own TRD — nothing depends on it.
3. **Renaming `NEXT_PUBLIC_API_PROXY_BASE_URL`.** It is a misnomer for an app that proxies nothing
   (D8). Renaming it means touching the POS's env too, so it is worth doing only alongside the proxy
   decision above.

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
