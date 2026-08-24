# TRD — React Compiler Adoption

**Status:** proposed
**Scope:** `apps/web`, `apps/mobile`, `apps/order`, `libs/ui`, `libs/provider`, root tooling (Babel / Vite / Next / ESLint / Nx)
**Non-scope:** `apps/api`, `libs/api-contract` codegen, `docs-site`
**Date of research:** 2026-08-23 (all version claims below were checked against the npm registry on that date)

---

## 1. Problem statement

Every re-render in this codebase re-creates every callback, every derived array and every child
element, and nothing stops that work from propagating. Concretely, today:

- **`React.memo` is used exactly zero times** across `apps/` and `libs/`. There is no bailout
  anywhere in the tree — a state change at the top of a screen re-renders the whole screen.
- **`useCallback` appears in 24 files, `useMemo` in 3**, out of 708 `.tsx` files. Memoization is
  applied ad hoc, where somebody noticed a problem, not systematically.
- The architecture makes this worse by construction: every screen is a `*Controller` hook
  (`libs/ui/src/presentation/controllers/*.tsx`, ~20 of them) that returns a **fresh object literal**
  of state + handlers on every render, consumed by a `*Handler` screen
  (`libs/ui/src/presentation/screens/*.tsx`) which spreads it into presentational components. Every
  one of those props is a new reference every render.
- The heaviest screens are exactly the ones staff use all day: `TransactionItemSelect` (326 lines),
  `TransactionCartView` (303), `ProductList` (260), `TransactionList` (249), `PurchaseListGroupedView`
  (348). These are list + form screens on cheap Android hardware.

The manual fix — sprinkling `useMemo` / `useCallback` / `memo` across ~570 components — is a large,
error-prone, permanently-maintained diff. React Compiler does that transformation at build time
instead, and does not rot when someone adds a prop.

**This document does not implement anything.** It records what the compiler needs, what this repo
would have to change to satisfy it, and a phase plan where each phase is one small, reviewable,
independently revertable PR.

---

## 2. What React Compiler needs (state of the world, Aug 2026)

React Compiler shipped **1.0 in October 2025**. It is no longer a beta/`experimental-` package.

| Package | Version we would use | Notes |
|---|---|---|
| `babel-plugin-react-compiler` | `1.0.0` | The compiler itself. Babel-only (a Rust/Turbopack port exists in Next 16 as `turbopackRustReactCompiler`, not usable here). |
| `react-compiler-runtime` | `1.0.0` | Runtime shim. Peer range is `^17 \|\| ^18 \|\| ^19` — **this is the package that makes adoption on React 18 possible.** |
| `eslint-plugin-react-hooks` | `7.1.1` | Ships the compiler's diagnostic rules. Peer range still includes `^8.0.0-0`, so **no ESLint 9 migration is required**. |

### 2.1 Hard requirements

1. **React 17, 18 or 19.** React 19 is the native target. On React 18 you set `target: '18'` and install
   `react-compiler-runtime`; the compiler then emits its `c()` calls against that package instead of
   React 19's built-in `react/compiler-runtime`. We are on React 18.2 — supported.
2. **A Babel pass over your source.** Metro (mobile) and Vite (order app, Storybook) already run Babel.
   Next runs SWC, so Next has to be told to add a Babel pass — which is what `experimental.reactCompiler`
   does for us.
3. **The compiler plugin must run first in the Babel plugin list.** It needs unlowered source.
4. Defaults worth knowing (read out of `babel-plugin-react-compiler@1.0.0`'s own `defaultOptions`):
   - `target: '19'` → **we must override to `'18'`**.
   - `sources: filename => filename.indexOf('node_modules') === -1` → node_modules is skipped by
     default. This matters for Metro, which otherwise runs Babel over dependencies too.
   - `panicThreshold: 'none'` → a component the compiler cannot safely handle is **silently skipped**,
     not a build failure. Safe, but it means "it built" is not proof that anything was optimized;
     see §8.
   - `compilationMode: 'infer'` → compiles components/hooks it can prove are components/hooks.
   - `enableReanimatedCheck: true` → when `react-native-reanimated` is resolvable, the compiler injects
     Reanimated-aware type definitions so shared values and worklets are modelled correctly. This is
     the built-in answer to the 2024-era "compiler broke my worklet" reports.

---

## 3. Current state audit

### 3.1 Where we are

| Dependency | This repo | Latest (Aug 2026) | Needed for compiler on React 18? |
|---|---|---|---|
| `react` / `react-dom` | `^18.2.0` | `19.2.8` | **No** — 18 is supported via `target: '18'` |
| `next` | `14.2.3` | `16.3.2` | **Yes → 15.x** (see §4.2) |
| `react-native` | `0.74.1` | `0.87.0` | No |
| `expo` | `~51.0.39` | `57.x` | No (we do not use `babel-preset-expo`) |
| `tamagui` + `@tamagui/*` | `^1.111.10` | `2.7.7` (last 1.x: `1.144.4`) | **No** |
| `nx` / `@nx/*` | `19.3.0` | `23.1.1` | Only as a consequence of the Next bump (§4.3) |
| `vite` / `@vitejs/plugin-react` | `^5` / `^4` | `8.x` / `6.1.0` | No — v4's `babel.plugins` option is all we need |
| `eslint` | `~8.57.0` | `9.x` | No — plugin v7 still supports ESLint 8 |
| `eslint-plugin-react-hooks` | `4.6.0` | `7.1.1` | **Yes, to get the compiler lint rules** |

The important negative result: **Tamagui, React Native, Expo and React itself do not need to move.**
The only forced upgrade is Next.js, and only because Next 14 has no way to insert the compiler's Babel
pass without disabling SWC entirely.

### 3.2 Build pipelines, and where the plugin has to be inserted

| Surface | Bundler | Transform today | Tamagui plugin | Insertion point |
|---|---|---|---|---|
| `apps/web` (Next, **Pages Router**) | webpack | SWC | `@tamagui/next-plugin` (static extraction, `outputCSS` in prod) | `next.config.js` → `experimental.reactCompiler` |
| `apps/mobile` (RN 0.74 + Expo modules) | Metro | Babel, `apps/mobile/.babelrc.js` (two branches: `@nx/react/babel` for build/storybook, `@react-native/babel-preset` otherwise) | none | `.babelrc.js` `plugins[0]` |
| `apps/order` (Vite SPA, GitHub Pages) | Vite 5 | `@vitejs/plugin-react` 4 (Babel) | `@tamagui/vite-plugin` | `react({ babel: { plugins: [...] } })` |
| `libs/ui` Storybook | Vite 5 (`@storybook/react-vite` 8.6) | Babel via the builder's React plugin | vite plugin via `viteFinal` | `viteFinal` (see §7 P3 caveat) |
| Jest — `libs/ui` | — | `@swc/jest` | — | not compiled (see R5) |
| Jest — `apps/web` | — | `babel-jest` + `@nx/next/babel` | — | inherits nothing; opt-in later |
| Jest — `apps/mobile` | — | `babel-jest` with `apps/mobile/.babelrc.js` | — | **compiled automatically** once P4 lands |

### 3.3 Readiness evidence (measured, not assumed)

`react-compiler-healthcheck@latest` was run against this working tree:

```
libs/**/*.{ts,tsx}                         → Successfully compiled 565 out of 565 components.
apps/{web,mobile,order}/src/**/*.{ts,tsx}  → Successfully compiled   5 out of   5 components.
whole repo                                 → Successfully compiled 570 out of 570 components.
                                             StrictMode usage found.
                                             Found no usage of incompatible libraries.
```

**570/570.** Not one component in this codebase fails to compile, and the healthcheck found no
incompatible library (React Query, react-hook-form, Zod, ts-pattern, Solito and Tamagui are all fine).
This is the single strongest argument for doing this: the expensive part of a compiler adoption is
usually fixing Rules-of-React violations, and we appear to have essentially none.

Two supporting observations:

- StrictMode is on (`apps/web/src/pages/_app.tsx` / the order app), which is what surfaces impurity
  early. Storybook deliberately disables it for Tamagui portal reasons — that exception is unrelated.
- Direct Reanimated worklet usage in our own source: **none**. `useSharedValue` / `useAnimatedStyle` /
  `useDerivedValue` appear nowhere in `libs/` or `apps/` except Storybook/Vite *mocks*. Reanimated is
  reached only transitively through Tamagui's moti animation driver, inside `node_modules`, which the
  compiler skips by default. The biggest historical React-Native-side risk simply does not apply here.

---

## 4. Decisions

### D1 — Adopt on React 18 with `target: '18'`; do **not** make React 19 a prerequisite

This is the load-bearing decision, so the reasoning is spelled out.

This is a single-`package.json` monorepo: `react` is hoisted and shared by web, mobile, order and
Storybook. There is no way to give the web app React 19 and leave mobile on 18. So "upgrade to React 19
first" is not a React upgrade, it is this chain:

```
react 19 → react-native ≥ 0.78 (React 19 requires it)
         → expo 51 → 54+ (six SDK jumps, native project regeneration, iOS/Android release cycle)
         → refresh 5 patch-package patches (reanimated, screens, safe-area-context, svg, config)
         → @testing-library/react-native ≥ 14 (peer: react ≥19, react-native ≥0.78)
         → react-test-renderer 19, @testing-library/react 16
         → tamagui: 1.111 → ≥1.100-something for React 19 support, realistically → 2.x
           (tamagui 2 peer is react ">=19" and targets RN 0.81 + New Architecture)
         → next 15/16, react-native-web 0.21, victory, ...
```

That is a multi-month program touching every native build, gated on app-store releases — and it buys
us *nothing extra* for the compiler, because `react-compiler-runtime` gives React 18 the same
`c()` runtime that React 19 has built in. The optimization is identical; only the import source differs.

So: **compiler now on React 18, React 19 later as its own program** (§9). When React 19 does land,
backing the shim out is a two-line diff (`target: '18'` → default, drop the dependency).

### D2 — Next.js 14 → 15 is the one unavoidable upgrade

`experimental.reactCompiler` **does not exist in Next 14.2** — it was introduced in Next 15. On Next 14
the only way to run the compiler is to add a `.babelrc` to `apps/web`, which makes Next fall back from
SWC to Babel **for the entire app**. That is unacceptable here for a specific reason: this build is
already memory-constrained. `apps/web/next.config.js` pins `experimental.cpus: 1`,
`workerThreads: false` and `config.parallelism = 1`, and `apps/web/Dockerfile` sets
`--max-old-space-size=6144`, all with comments explaining that Tamagui's static extraction plus
multi-worker compilation was blowing past the host's memory ceiling. Swapping SWC for Babel across the
whole app on top of that is the wrong trade.

Next 15 is a *cheap* upgrade for us because **Next 15 kept Pages Router working on React 18** (that was
an explicit compatibility decision, vercel/next.js#69484), and `apps/web` is 100% Pages Router —
`apps/web/src/pages/**`, no `app/` directory. Confirmed on the registry: `next@15.5.x` still declares
`react: "^18.2.0 || ^19.0.0"` as a peer. The App-Router-only breaking changes of Next 15 (async
`cookies()`/`headers()`/`params`) do not touch us.

**Next 16 is explicitly out of scope for this program**: it requires Node ≥ 20.9 (fine — the Dockerfile
is on node:22, but CI pins node 20 in `.github/workflows/*`), targets React 19.2 for App Router, and
its Pages Router story needs verification before anyone plans that jump. Nothing about it is needed to
get auto-memoization.

### D3 — On web, bridge the React 18 runtime with a webpack alias, not a config option

Next 15's config schema for `experimental.reactCompiler` is a `z.strictObject` accepting **only**
`compilationMode` and `panicThreshold` (verified in `packages/next/src/server/config-schema.ts` at
`v15.5.4`). `target` and `runtimeModule` are *rejected* — those became forwardable only with the
promoted `reactCompiler` option in Next 16.

So on Next 15 + React 18 the compiler runs with its default `target: '19'` and emits
`import { c } from "react/compiler-runtime"`, a subpath React 18 does not have. The fix is one line in
the webpack hook we already own:

```js
config.resolve.alias['react/compiler-runtime'] = require.resolve('react-compiler-runtime');
```

`react-compiler-runtime@1.0.0` exports exactly the `c` that React 19's subpath does, and declares
React 18 as a supported peer. This is the community-standard workaround for this exact combination and
it disappears entirely under Next 16 or React 19.

### D4 — Enable surface by surface, smallest blast radius first

Order app (internal, GitHub Pages, small) → Storybook (dev-only) → mobile → web. Web is last because it
is the surface with the framework upgrade *and* the memory-constrained production build. Each
enablement is one boolean/one plugin entry, so each is revertable on its own.

### D5 — Lint before compile

`eslint-plugin-react-hooks@7` carries the compiler's own diagnostics (`react-hooks/purity`,
`react-hooks/refs`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`,
`react-hooks/set-state-in-render`, …). Landing those *first*, as their own PR, means any Rules-of-React
problem shows up as a lint diff a reviewer can read, not as a mysterious behavior change after the
compiler is on. Given 570/570 already compile, this PR is expected to be small.

### D6 — Do not touch Tamagui

Tamagui 1.111 needs no change for any of this. The reported Tamagui/compiler friction is specifically
about **`@tamagui/babel-plugin`** (the native-side optimizing compiler) fighting the React Compiler for
plugin order — and `apps/mobile/.babelrc.js` does not use `@tamagui/babel-plugin` at all. On web and
the order app, Tamagui's extraction runs as a webpack loader / Vite plugin, not as a Babel plugin in the
same pass, so ordering is not contended. Tamagui 2 (peer `react >=19`) belongs to the React 19 program.

### D7 — Leave manual memoization in place during rollout; remove it afterwards, deliberately

`react-hooks/preserve-manual-memoization` guarantees the compiler will not *weaken* an existing
`useMemo`/`useCallback`, so the 27 files that have them are safe to leave alone while we roll out.
Deleting them is a separate cleanup PR (P8) with no behavioral risk once the compiler owns memoization —
and it is optional.

---

## 5. Target configuration

### 5.1 Dependencies (root `package.json`)

```jsonc
"dependencies": {
  "react-compiler-runtime": "^1.0.0"        // ships in the bundle → a real dependency
},
"devDependencies": {
  "babel-plugin-react-compiler": "^1.0.0",
  "eslint-plugin-react-hooks": "^7.1.1"     // was 4.6.0
},
"overrides": {
  "eslint-plugin-react-hooks": "^7.1.1"     // see R7
}
```

### 5.2 `apps/mobile/.babelrc.js`

```js
// React Compiler must run before anything else lowers the source; the Reanimated
// plugin must stay last (its own requirement). Both hold simultaneously.
const reactCompiler = ['babel-plugin-react-compiler', { target: '18' }];

module.exports = function (api) {
  api.cache(true);

  if (
    process.env.NX_TASK_TARGET_TARGET === 'build' ||
    process.env.NX_TASK_TARGET_TARGET?.includes('storybook')
  ) {
    return {
      presets: [['@nx/react/babel', { runtime: 'automatic' }]],
      plugins: [reactCompiler, 'react-native-reanimated/plugin'],
    };
  }

  return {
    presets: [['module:@react-native/babel-preset', { useTransformReactJSX: true }]],
    plugins: [reactCompiler, 'react-native-reanimated/plugin'],
  };
};
```

Both branches get it — otherwise dev and release builds would run different code. `node_modules` is
excluded by the plugin's default `sources`, so Metro's Babel pass over dependencies stays untouched.

### 5.3 `apps/order/vite.config.ts`

```ts
plugins: [
  tamaguiPlugin({ disableWatchTamaguiConfig: true }),
  react({
    babel: { plugins: [['babel-plugin-react-compiler', { target: '18' }]] },
  }),
  nxViteTsPaths(),
],
```

`@vitejs/plugin-react@4` already accepts `babel.plugins`; no Vite 8 / plugin-react 6 upgrade needed.
(Under plugin-react 6 this becomes the tidier `reactCompilerPreset` — a later cleanup, not a blocker.)

### 5.4 `apps/web/next.config.js` (after the Next 15 bump)

```js
const nextConfig = {
  // ...unchanged: nx, transpilePackages, rewrites...
  experimental: {
    cpus: 1,
    workerThreads: false,
    reactCompiler: true,          // Next 15: boolean | { compilationMode, panicThreshold } only
  },
  webpack(config) {
    config.parallelism = 1;
    // React 18 has no `react/compiler-runtime` subpath; the standalone runtime
    // package provides the identical `c()` implementation. Drops out when we
    // reach React 19 (see docs/trd-react-compiler-adoption.md §D3).
    config.resolve.alias['react/compiler-runtime'] = require.resolve(
      'react-compiler-runtime'
    );
    return config;
  },
};
```

### 5.5 ESLint (`.eslintrc.json`, legacy config — no flat-config migration)

```jsonc
{
  "files": ["*.ts", "*.tsx"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    // React Compiler diagnostics
    "react-hooks/config": "error",
    "react-hooks/error-boundaries": "error",
    "react-hooks/globals": "error",
    "react-hooks/immutability": "error",
    "react-hooks/preserve-manual-memoization": "error",
    "react-hooks/purity": "error",
    "react-hooks/refs": "error",
    "react-hooks/set-state-in-effect": "error",
    "react-hooks/set-state-in-render": "error",
    "react-hooks/static-components": "error",
    "react-hooks/unsupported-syntax": "warn",
    "react-hooks/use-memo": "error",
    "react-hooks/incompatible-library": "warn"
  }
}
```

(`plugin:react-hooks/recommended` also works under ESLint 8 with plugin v7 and auto-picks up future
rules; the explicit list is written out here so the phase PR can start rules at `warn` if the initial
violation count is large.)

---

## 6. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Tamagui static extraction and the compiler interfere on web/order (wrong or missing CSS) | Low | They run in different passes (loader/plugin vs. Babel). Verify `apps/web/public/tamagui.css` is produced and comparable in size; smoke-test a themed screen + a Sheet/Dialog. Fallback: `experimental.reactCompiler: { compilationMode: 'annotation' }` and opt in per file. |
| R2 | Web build time/memory regresses past the host ceiling (the compiler adds a Babel pass to an already memory-capped webpack build) | **Medium** | Measure `nx run web:build` wall time + peak RSS before/after in the same PR description. If it regresses materially: keep `cpus: 1`, consider raising `--max-old-space-size`, or fall back to `annotation` mode and enable per screen. Escape hatch is one config key. |
| R3 | Reanimated worklets break under compilation | Very low | No worklet code in our source; compiler 1.0 ships `enableReanimatedCheck` (on by default) and Reanimated-aware types; `node_modules` is excluded from compilation. |
| R4 | Silent bail-outs: `panicThreshold: 'none'` means unoptimizable components are skipped quietly, so "it builds" proves nothing | Medium | Keep `react-compiler-healthcheck` as a repo script and record the compiled count in each phase PR (baseline: 570/570). A drop in that number is the regression signal. |
| R5 | Tests don't exercise compiled output — `libs/ui` runs on `@swc/jest`, which has no compiler pass, so ~all component tests test the *un*compiled code | Medium | Accepted for now, stated explicitly. `apps/mobile` tests *do* run through `.babelrc.js` and therefore do exercise compiled output after P4 — that is our compiled-code test signal. Adding a Babel/compiler pass to the `libs/ui` Jest transform is a possible follow-up, at a test-runtime cost. |
| R6 | The Next 14→15 and Nx 19→20 upgrades break something unrelated to the compiler | Medium | They are their own PRs (P5, P6), landed and deployed before any compiler flag is flipped on web, so a rollback is unambiguous. |
| R7 | `eslint-plugin-react-hooks@7` conflicts with `eslint-config-next@14.2.3`, which depends on `^4.5.0` | Medium | Pin with an npm `overrides` entry (§5.1). Resolves itself in P6, since `eslint-config-next@15` moved to `^5.0.0` and the override can then be re-evaluated. |
| R8 | The 5 `patch-package` patches (reanimated, screens, safe-area-context, svg, config) go stale | Not in this program | Nothing here bumps those packages. They are a React 19 program concern (§9). |
| R9 | Behavior change from over-eager memoization in components that mutate refs during render (`DebouncedInput`, `RentalCheckinHandler`, `RentalListHandler` all assign to `.current`) | Low | These are effect/handler-scoped assignments, and `react-hooks/refs` (P1) flags the render-phase ones specifically. Manual smoke test of the debounced search inputs and the rental check-in print dialog in P4/P7. |

---

## 7. Rollout phases

Nine phases. Each row is one PR. Phases P1–P4 are independent of the framework upgrade and can land
while P5/P6 are still in review.

| Phase | PR | Touches | Size | Risk |
|---|---|---|---|---|
| P0 | Healthcheck script + this TRD | root `package.json`, `docs/` | XS | none |
| P1 | Compiler lint rules | `.eslintrc.json`, root deps, fixes | S | low |
| P2 | Compiler deps + enable on `apps/order` | root deps, `apps/order/vite.config.ts` | S | low |
| P3 | Enable in Storybook *(optional)* | `libs/ui/.storybook/main.ts` | S | low |
| P4 | Enable on `apps/mobile` | `apps/mobile/.babelrc.js` | S | medium |
| P5 | Nx 19.3 → 20.x | lockfile, Nx configs | M | medium |
| P6 | Next 14.2 → 15.x | `apps/web` deps + config | M | medium |
| P7 | Enable on `apps/web` | `apps/web/next.config.js` | S | medium |
| P8 | Remove redundant manual memoization *(optional)* | ~27 files in `libs/ui` | M | low |
| P9 | React 19 track | *separate program* | XL | — |

---

### P0 — Baseline and guardrail

**Goal:** make the compiler's own diagnostics a repeatable command before changing any build.

**Changes**
- Add `"react-compiler:healthcheck": "react-compiler-healthcheck --src \"{apps,libs}/**/*.{ts,tsx}\""`
  to root `package.json` scripts.
- Land this TRD.

**Verification:** script prints `570 out of 570`.
**Rollback:** delete the script.

---

### P1 — Compiler lint rules (no runtime change)

**Goal:** surface every Rules-of-React violation as reviewable lint output *before* any code is
compiled differently.

**Changes**
- `eslint-plugin-react-hooks` `4.6.0` → `^7.1.1`, plus the `overrides` entry (R7).
- Add the rule block from §5.5 to the root `.eslintrc.json` `*.ts,*.tsx` override.
- Fix whatever it reports.

**Verification:** `npm run lint` clean across all projects; **zero source behavior change** — the diff
should be config plus small, obviously-correct fixes.
**If the violation count is large:** split — P1a lands the rules at `"warn"`, P1b fixes them and
promotes to `"error"`. Do not let a big fix set ride along with the plugin upgrade.
**Rollback:** revert; nothing depends on it yet.

---

### P2 — Install the compiler and turn it on for `apps/order`

**Goal:** first real compilation, on the smallest and least critical surface (customer table-ordering
SPA on GitHub Pages).

**Changes**
- Add `babel-plugin-react-compiler` (dev) + `react-compiler-runtime` (prod) at `^1.0.0`.
- `apps/order/vite.config.ts` as in §5.3.

**Verification**
- `nx run order:build` succeeds; compare `dist/order` bundle size before/after (expect a small increase
  — memoization is code).
- `nx run order:serve`, then in React DevTools confirm components show the **"Memo ✨"** badge.
- Manual pass: browse menu → open item detail sheet → add to cart → cart screen → checkout stub.
  The cart lives in a context (`libs/ui/src/app/CartProvider.tsx`), which is exactly where a
  memoization bug would show up as "the cart badge stopped updating".
- `nx run order-e2e:e2e` green.

**Rollback:** remove the `babel` block. One line.

---

### P3 — Storybook *(optional)*

**Goal:** run `libs/ui` under the compiler in a dev harness before shipping it in an app.

**Changes:** insert the compiler into the Babel options of the React plugin used by
`@storybook/react-vite` inside the existing `viteFinal` in `libs/ui/.storybook/main.ts`.

**Caveat — spike this first:** `@storybook/react-vite@8.6`'s preset adds only docgen plugins; the React
plugin comes from the builder, so naively appending a second `@vitejs/plugin-react` can double the JSX
transform. Either reconfigure the existing `vite:react-babel` plugin instance in `viteFinal`, or skip
this phase — Storybook is a dev harness, not a shipped artifact, and P2/P4 already cover `libs/ui`.
**Timebox: half a day.** If it fights back, drop the phase.

**Verification:** `nx run ui:build-storybook`, then spot-check interactive stories (forms, sheets,
dialogs).

---

### P4 — `apps/mobile`

**Goal:** the surface with the most to gain — mid-range Android, long lists, form-heavy screens.

**Changes:** `apps/mobile/.babelrc.js` as in §5.2.

**Verification**
- `nx run mobile:test` — note that these tests now execute *compiled* output (they share `.babelrc.js`),
  making this the only automated coverage of compiled code in the repo (R5).
- `nx run mobile:start`, reload, walk the high-traffic flows: transaction create → item select → cart →
  checkout; product list search (debounced input, R9); rental check-in incl. the print dialog (R9);
  stock check form.
- Release build: `nx run mobile:build-android`, install, confirm startup and the same flows.
- Optional but valuable: with React DevTools Profiler, record the transaction-item-select screen before
  and after and put the commit counts in the PR description.

**Rollback:** drop `reactCompiler` from both plugin arrays.

---

### P5 — Nx 19.3 → 20.x

**Goal:** prerequisite tooling for Next 15. `@nx/next@19.3` generates and targets Next `14.2.3`;
`@nx/next@20.x` targets Next `~15.2.4`. Bundling this with the Next bump would make a failure
ambiguous.

**Changes:** `npx nx migrate 20.x` + `nx migrate --run-migrations`, review the generated config diffs.
**No compiler work in this PR.**

**Verification:** `nx run-many --target=lint --all`, `nx run-many --target=test --all`,
`nx run web:build`, `nx run order:build`, `nx run mobile:test`. Web deploy from this commit before P6.
**Rollback:** revert the commit (lockfile + configs only).

---

### P6 — Next 14.2 → 15.x (still React 18)

**Goal:** get the `experimental.reactCompiler` hook. React, React DOM and every Tamagui package stay
exactly where they are.

**Changes**
- `next` `14.2.3` → `~15.5.x`; `eslint-config-next` to match (`^15`), and re-evaluate the R7 override.
- Run `npx @next/codemod@latest upgrade` and review; expect little for a Pages-Router app.
- Verify the existing `experimental.cpus` / `workerThreads` keys and the `rewrites()` proxy still
  validate against Next 15's config schema.
- CI (`.github/workflows/*`) pins node 20 — fine for Next 15 (`>=18.18`).

**Verification**
- `nx run web:build` green, and **record wall time + peak memory** — this is the baseline P7 will be
  compared against.
- `@tamagui/next-plugin` extraction still emits `apps/web/public/tamagui.css`.
- Docker build (`apps/web/Dockerfile`) succeeds under the same `--max-old-space-size=6144`.
- `nx run web-e2e:e2e` green; deploy and smoke-test before starting P7.

**Rollback:** revert; the app is unchanged apart from framework version.

---

### P7 — Enable the compiler on `apps/web`

**Changes:** `apps/web/next.config.js` per §5.4 — `experimental.reactCompiler: true` plus the
`react/compiler-runtime` webpack alias (D3).

**Verification**
- Build succeeds *and* `react/compiler-runtime` resolves (a missing alias fails loudly at build time).
- **Build time and peak memory vs. the P6 baseline** — this is the phase where R2 is decided. If it
  regresses badly, land instead as `reactCompiler: { compilationMode: 'annotation' }` and opt screens in
  with `"use memo"` one at a time.
- React DevTools on the running app: "Memo ✨" badges present.
- Manual pass over the POS flows: login, transaction create/list/detail, product & material CRUD,
  stock check, rental check-in/checkout, dashboard date-range filter, expense statistics.
- `nx run web-e2e:e2e` green.

**Rollback:** flip the flag to `false`.

---

### P8 — Remove redundant manual memoization *(optional)*

Delete the hand-written `useMemo` (3 files) / `useCallback` (24 files) that the compiler now subsumes,
and add a short note to `README.md` telling contributors that memoization is automatic and that
`"use no memo"` is the escape hatch for a component that misbehaves.

Do this **after** every surface is compiled, in small batches by directory, each batch smoke-tested.
Keep any `useCallback` that exists for a non-memoization reason (a stable identity passed to a native
module, an effect dependency deliberately pinned).

---

### P9 — React 19 track *(separate program, not part of this TRD)*

Only worth starting for its own reasons — Tamagui 2, New Architecture, Expo SDK currency, Next 16 — not
for the compiler, which is already fully delivered by P7. Sketch of the chain, current as of Aug 2026:

`react@19.2` → `react-native@0.79+` → `expo@54+` → refresh 5 patch-package patches →
`@testing-library/react-native@14` (peer: react ≥19, RN ≥0.78) + `react-test-renderer@19` +
`@testing-library/react@16` → `react-native-web@0.21` → `tamagui@2.x` (peer `react >=19`, targets
RN 0.81) → optionally `next@16` (Node ≥20.9; `reactCompiler` becomes stable config, and
`turbopackRustReactCompiler` removes the Babel pass entirely).

When it lands, the compiler work shrinks: drop `react-compiler-runtime`, drop `target: '18'`, drop the
webpack alias.

---

## 8. How we will know it worked

**Correctness (per phase, gates the merge)**
- `nx run-many --target=test --all` and the relevant e2e suite green.
- `npm run react-compiler:healthcheck` still reports **570/570** (or higher as code is added). A drop
  means new code stopped being compilable — that is the R4 alarm.
- Manual smoke pass over the flows listed per phase.

**Performance (reported, not gated — these are the reason we are doing this)**
- React DevTools Profiler commit counts on `TransactionItemSelect`, `TransactionCartView`,
  `ProductList` and `TransactionList`, before vs. after, on the same interaction.
- Bundle size delta per surface (expect a small increase; flag anything > ~5%).
- `nx run web:build` wall time and peak RSS, P6 baseline vs. P7 (R2).

**Maintenance**
- After P8: `useCallback`/`useMemo` occurrences trending toward zero, with no perf regression.

---

## 9. Open questions

1. **P3 Storybook** — is reconfiguring the builder's React plugin worth the effort, or do we skip it?
   (Timeboxed; default answer is skip.)
2. **R5 test/runtime divergence** — do we eventually want the compiler in the `libs/ui` Jest transform
   (moving off `@swc/jest` for that project, at a test-speed cost), or is mobile's Babel-based Jest
   enough coverage of compiled output?
3. **P8 scope** — remove manual memoization repo-wide, or leave it and let it decay naturally?
4. **Web deploy host limits** — what is the actual memory ceiling on the current web host? R2's fallback
   plan depends on knowing it rather than inferring it from the comments in `next.config.js`.
5. Is anyone already planning an Expo/RN upgrade for unrelated reasons? If so, P9 may reorder the whole
   thing — the compiler work would simply skip the `target: '18'` shim.

---

## References

- [React Compiler installation](https://react.dev/learn/react-compiler/installation) ·
  [configuration](https://react.dev/reference/react-compiler/configuration) ·
  [`target`](https://react.dev/reference/react-compiler/target) ·
  [React Compiler v1.0 announcement](https://react.dev/blog/2025/10/07/react-compiler-1)
- [`next.config.js: reactCompiler`](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) ·
  [Next.js 15](https://nextjs.org/blog/next-15) ·
  [Support React 18 in Pages Router (vercel/next.js#69484)](https://github.com/vercel/next.js/pull/69484) ·
  [Enabling React Compiler for a React 18 Pages Router app (vercel/next.js#86702)](https://github.com/vercel/next.js/discussions/86702)
- [Integrating React Compiler + Tamagui (tamagui#3605)](https://github.com/tamagui/tamagui/discussions/3605) ·
  [Tamagui 2 announcement](https://tamagui.dev/blog/version-two)
- [React Compiler on Expo](https://docs.expo.dev/guides/react-compiler/) ·
  [Reanimated + React Compiler (react-native-reanimated#6826)](https://github.com/software-mansion/react-native-reanimated/issues/6826)
- Package metadata (npm registry, 2026-08-23): `babel-plugin-react-compiler@1.0.0`,
  `react-compiler-runtime@1.0.0` (peer `react ^17 || ^18 || ^19`), `eslint-plugin-react-hooks@7.1.1`
  (peer `eslint ... ^8 || ^9 || ^10`), `next@15.5.23` (peer `react ^18.2.0 || ^19`),
  `@nx/next@20.8.1` (`nextVersion = ~15.2.4`), `tamagui@2.7.7` (peer `react >=19`).
