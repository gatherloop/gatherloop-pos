# TRD — Split `libs/ui` presentation by app, and rename the app projects

**Status:** proposed
**Scope:** `libs/ui/src/presentation`, `libs/ui/src/app`, `libs/ui/src/index*.ts`, `libs/ui/.storybook`, `apps/{web,web-e2e,order,order-e2e,mobile,mobile-e2e}` (directory + Nx project names only), `tsconfig.base.json`, CI/deploy configs that name those projects
**Non-scope:** `libs/ui/src/{data,domain,utils}`, `libs/api-contract`, `libs/provider`, `apps/api`, any runtime behaviour, any component API, native bundle identifiers
**Date of research:** 2026-09-07 (all counts below measured against `main` @ `91d5451`)

---

## 1. Problem statement

`libs/ui` serves three deployable frontends — the POS web app (`apps/web`), the POS mobile app
(`apps/mobile`) and the customer ordering app (`apps/order`) — out of one flat presentation layer:

```
libs/ui/src/
  app/                       66 files   ← every composition root, POS and order together
  presentation/
    components/             298 files   ← 21 domain folders + base/, POS and order together
    controllers/             87 files   ← POS and order together
    screens/                242 files   ← POS and order together
  data/  domain/  utils/  config.ts
```

Nothing in the folder layout says which app a file belongs to. The separation exists, but it is
carried entirely by two hand-maintained barrels and a comment:

```ts
// libs/ui/src/index.order.ts
// The root barrel (./index.ts) re-exports ./app, which pulls in every POS
// composition root. Next bundles per page, so importing the root barrel from
// the order app would drag the whole POS into the customer's first load —
// this barrel stays POS-free so it doesn't.
```

That produces four concrete costs.

### 1.1 The boundary is a convention, not a constraint

`libs/ui/src/app/index.ts` deliberately omits the eight order composition roots, and
`presentation/{screens,controllers}/index.ts` deliberately omit the order screens and controllers.
Nothing enforces either omission. A single `export * from './MenuListScreen'` added to
`presentation/screens/index.ts` silently pulls the customer app's menu into `@gatherloop-pos/ui`,
and the only thing that would notice is a bundle-size review that nobody runs.

The reverse leak is just as easy: `presentation/components/index.ts` already does
`export * from './menu'`, and `presentation/components/base/index.tsx` already does
`export * from './OrderLayout'`, so today's POS graph *does* reach order-only components through
the shared barrels. Nothing breaks (tree shaking handles it in the Next builds) but the graph no
longer tells the truth about who depends on what.

### 1.2 Storybook is organised by nothing in particular

All 165 stories set an explicit `title`, and those titles have accreted seven top-level namespaces:

| Top level | Stories | What it actually is |
| --- | ---: | --- |
| `Features/…` | 78 | POS components, grouped by domain |
| `Screens/…` | 49 | POS screens, grouped by domain |
| `Base/…` | 25 | Shared primitives — plus `Base/OrderLayout`, which is order-only |
| `Menu/…` | 7 | Order components **and** two order screens |
| `Cart/…` | 4 | Order components **and** two order screens |
| `Order/…` | 1 | `TableResolveScreen` |
| `Checkout/…` | 1 | `CheckoutScreen` |

A reviewer opening Storybook cannot answer "show me the customer ordering app" — its 14 stories are
spread over five sidebar roots, two of which mix components with screens, while the POS's 127 use a
completely different two-level scheme.

### 1.3 The barrels are large and can only grow

`libs/ui/src/index.ts` re-exports `./app` (56 composition roots) plus all of `./data`, `./domain`,
`./utils` and `./config`. Every one of the 56 `apps/web`/`apps/mobile` import sites resolves that
whole surface. `index.order.ts` exists solely to *not* be that barrel, and every new customer-app
screen has to be hand-added to it — a step that is easy to forget and whose omission fails only at
the app, not in `libs/ui`.

### 1.4 The `apps/` names no longer describe the apps

`web` and `mobile` are both POS clients; `order` is the customer app and is also a web app. The
names predate the customer app and now read as if `order` were a peer of `web` in kind rather than
in platform.

---

## 2. Goals and non-goals

### Goals

1. Every presentation file lives under a folder that names the app it serves: `pos/`, `order/`, or
   `shared/`.
2. Composition roots (`libs/ui/src/app`) move under the app they compose.
3. Storybook groups by app first: `POS/…`, `Order/…`, `Shared/…`.
4. Each app gets its own barrel, and the barrels shrink accordingly.
5. A cross-app import (POS → order or order → POS) fails lint, rather than passing review.
6. `apps/` directories and Nx project names become `pos-web`, `pos-web-e2e`, `pos-mobile`,
   `pos-mobile-e2e`, `order-web`, `order-web-e2e`.
7. Every phase is a single reviewable PR that leaves `nx run-many --target=lint,test --all` and both
   Playwright suites green.

### Non-goals

- **No behaviour change.** Not one component API, prop, state machine or rendered output changes.
  Every diff in phases 1–6 is a path, a barrel line, or a Storybook `title` string.
- **`data/`, `domain/` and `utils/` stay where they are** and stay shared. Some of them are
  arguably order-only (`domain/usecases/{cart,menuList,menuItemDetail,tableResolve}.ts`,
  `domain/repositories/{menu,publicTable,session,cart}.ts`, `data/api/{menu,cart,publicTable}.ts`,
  `data/browser/session*.ts`) but Clean Architecture puts the app boundary at presentation, not at
  the domain, and splitting them would double the size of this refactor for no barrel or Storybook
  benefit. §9 records it as a possible follow-up.
- **No new Nx libraries.** See D3.
- **No native identifier changes.** `apps/mobile` → `apps/pos-mobile` renames the *directory*.
  `rootProject.name = 'Mobile'`, the `com.mobile` Android package, the iOS bundle id and the
  Xcode workspace name stay exactly as they are — changing them would ship as a different app.
- **No test rewrites.** Tests move with their subject; their content only changes where an import
  path does.

---

## 3. Current-state audit

### 3.1 Which files belong to which app

Measured by walking the import graph from `index.ts` and `index.order.ts` and then checking every
candidate's direct importers (the barrels inflate a naive reachability check — see §3.3).

**Order-owned — 54 files:**

| Layer | Files |
| --- | --- |
| `app/` (9) | `SessionProvider.tsx`, `CartProvider.tsx`, `TableResolve.tsx`, `MenuList.tsx`, `MenuItemDetail.tsx`, `Cart.tsx`, `CartItemEdit.tsx` (+ `CartItemEdit.test.tsx`), `Checkout.tsx` |
| `presentation/screens/` (22) | `TableResolve{Screen,Handler}`, `MenuList{Screen,Handler}`, `MenuItemDetail{Screen,Handler}`, `CartScreen`, `CartHandler`, `CartItemEditScreen`, `Checkout{Screen,Handler}` + their `.stories.tsx` / `.test.tsx` |
| `presentation/controllers/` (4) | `TableResolveController`, `MenuListController`, `MenuItemDetailController`, `CartController` |
| `presentation/components/menu/` (11) | `AmountStepper`, `CategoryChipList`, `MenuItemThumbnail`, `MenuProductCard`, `OptionValueChipGroup` + stories + `index.ts` |
| `presentation/components/cart/` (5) | `CartBar`, `CartLineItem` + stories + `index.ts` |
| `presentation/components/base/` (3) | `OrderLayout.tsx` + `OrderLayout.stories.tsx`, `SkeletonView.tsx` |

**Shared — `presentation/components/base/` minus the three above, plus
`presentation/controllers/controller.ts`.** The order surfaces import exactly six shared base
primitives (`EmptyView`, `ErrorView`, `Focusable`, `LoadingView`, `Sheet`, `ConfirmationAlert`);
the rest of `base/` (`Navbar`, `Sidebar`, `Layout`, `ListItem`, `Form`, `Pagination`, `Chart`,
`Markdown`, `Tabs`, `useIsCompactLayout`, `FloatingCartButton`, `PinnedActionBar`) is POS-only
today but is generic enough that it stays in `shared/` — see D2.

**POS-owned — everything else:** 57 `app/` files, 220 `screens/` files, 82 `controllers/` files,
203 `components/` files (19 domain folders; `components/base/` is 79 files and is shared).

### 3.2 What the user-supplied target tree is missing

The tree in the request has two children under `presentation/`:

```
presentation/
  pos/    { app, components, controllers, screens }
  order/  { app, components, controllers, screens }
```

There is no home in it for `components/base/` (79 files across 8 subfolders, imported by both apps) or for
`controllers/controller.ts` (the `Controller<State, Action>` type and `useController` hook that
every controller in both apps builds on). Duplicating them is not an option and putting them under
`pos/` and importing them from `order/` re-creates exactly the leak §1.1 describes. Hence D1.

### 3.3 The barrels already blur the boundary

`presentation/components/base/index.tsx` exports `OrderLayout` and `SkeletonView`;
`presentation/components/index.ts` exports `./menu` and `./cart`. Six POS screens import
`from '../components/base'` (the barrel) rather than a deep path, so a naive reachability walk from
`index.ts` reports 193 files as reachable from *both* entry points — including every order-only base
and menu component. The real, direct-import boundary is the table in §3.1. This is worth knowing
because it means the current graph cannot be used to verify the split; the lint rule in Phase 7 can.

### 3.4 How much import churn the move costs

| Measure | Count |
| --- | ---: |
| Import lines under `presentation/` that escape to `src/` (`../../…` or deeper) | 590 |
| Files under `presentation/` containing at least one | 406 |
| Files under `presentation/` importing `../../../.storybook/mocks/mockData` | 63 |
| Relative import lines under `app/` | 196 (across 65 files) |
| `app/` files importing `from '../presentation'` | 56 — **all** import only `*Handler` symbols |
| `apps/` files importing `@gatherloop-pos/ui` | 56 (55 `apps/web` pages + `apps/mobile/src/app/App.tsx`) |
| `apps/` files importing `@gatherloop-pos/ui/order` | 9 |
| Stories with an explicit `title` | 165 of 165 |

Every one of these is mechanical. §6 defines the exact rewrite rule and the verification that proves
a PR contains nothing but that rewrite.

### 3.5 What names the app projects today

| Where | Reference |
| --- | --- |
| `apps/*/project.json` | `name`, `sourceRoot`, `implicitDependencies` |
| `apps/web/jest.config.ts`, `apps/mobile/jest.config.ts` | `displayName`, `coverageDirectory` |
| `apps/web-e2e/playwright.config.ts` | `webServer.command: 'npx nx dev web'` |
| `apps/order-e2e/playwright.config.ts` | `webServer.command: 'npx nx run order:build && npx nx run order:start'` |
| `apps/web/Dockerfile` | `npx nx run web:build`, `COPY --from=build /app/apps/web/.next` |
| `apps/order/vercel.json` | `npx nx run order:build` |
| `.github/workflows/e2e-main.yml` | matrix `project: [web-e2e, order-e2e]`, artifact path `dist/.playwright/apps/${{ matrix.project }}` |
| `.github/workflows/deploy-api.yml` | `apps/api/**` path filter only — unaffected |
| `README.md`, `docs-site/**`, `E2E_TEST_PLAN.md`, `TESTING_REVIEW.md`, `HANDLER_INTEGRATION_TESTS_PLAN.md` | prose and links |
| `apps/web/package.json` | `"name": "web2"` (already wrong; fix while we are here) |

Native build files under `apps/mobile/android` and `apps/mobile/ios` reference `node_modules` only
by *relative* depth (`../../../../node_modules/react-native`). `apps/mobile` → `apps/pos-mobile`
keeps the depth identical, so none of them change.

**Out of repo, and therefore manual:** the Vercel project's Root Directory setting for the order app,
and whatever build command the POS web host is configured with. Both are named in the phases that
need them.

---

## 4. Target architecture

```
libs/ui/src/
  config.ts  config.native.ts
  data/                              (unchanged)
  domain/                            (unchanged)
  utils/                             (unchanged)
  __mocks__/                         (unchanged)
  presentation/
    shared/
      components/
        base/                        ConfirmationAlert, EmptyView, ErrorView, Focusable, Form,
                                     Layout, ListItem, LoadingView, Markdown, Navbar, Pagination,
                                     Sheet, Sidebar, Tabs, Chart, FloatingCartButton,
                                     PinnedActionBar, useIsCompactLayout
      controllers/
        controller.ts                Controller<State, Action>, useController
      index.ts
    pos/
      app/                           57 composition roots
      components/                    19 domain folders, 203 files
      controllers/                   82 controller hooks
      screens/                       220 screen + handler files
      index.ts
    order/
      app/                           SessionProvider, CartProvider, TableResolve, MenuList,
                                     MenuItemDetail, Cart, CartItemEdit, Checkout
      components/
        base/                        OrderLayout, SkeletonView
        menu/                        AmountStepper, CategoryChipList, MenuItemThumbnail,
                                     MenuProductCard, OptionValueChipGroup
        cart/                        CartBar, CartLineItem
      controllers/                   TableResolveController, MenuListController,
                                     MenuItemDetailController, CartController
      screens/                       TableResolve, MenuList, MenuItemDetail, Cart, CartItemEdit,
                                     Checkout (screens + handlers)
      index.ts
  index.ts                           @gatherloop-pos/ui        → shared only
  index.pos.ts                       @gatherloop-pos/ui/pos    → presentation/pos
  index.order.ts                     @gatherloop-pos/ui/order  → presentation/order
```

### 4.1 Entry points

| Specifier | Exports | Consumed by |
| --- | --- | --- |
| `@gatherloop-pos/ui` | `./config`, `./data`, `./domain`, `./utils`, `./presentation/shared` | everything |
| `@gatherloop-pos/ui/pos` | `./presentation/pos` | `apps/pos-web`, `apps/pos-mobile` |
| `@gatherloop-pos/ui/order` | `./presentation/order` | `apps/order-web` |

`presentation/pos/index.ts` re-exports `./app`, `./screens`, `./controllers`, `./components` — the
same three-barrel shape `presentation/index.ts` has today, plus `./app`. `presentation/order/index.ts`
is the same shape and finally replaces the hand-curated list in `index.order.ts`.

An `apps/pos-web` page ends up importing from two specifiers instead of one:

```ts
// before
import { ApiProductRepository, ProductList, ProductListProps,
         UrlProductListQueryRepository, getUrlFromCtx } from '@gatherloop-pos/ui';

// after
import { ApiProductRepository, UrlProductListQueryRepository,
         getUrlFromCtx } from '@gatherloop-pos/ui';
import { ProductList, ProductListProps } from '@gatherloop-pos/ui/pos';
```

That is the point: the second line is the part that is POS-specific, and it now says so.

### 4.2 Storybook

`title` stays explicit (D5). Every title gains an app segment as its first level:

| Today | After |
| --- | --- |
| `Features/Transactions/TransactionList` | `POS/Features/Transactions/TransactionList` |
| `Screens/Transactions/TransactionListScreen` | `POS/Screens/Transactions/TransactionListScreen` |
| `Base/Sheet` | `Shared/Base/Sheet` |
| `Base/OrderLayout` | `Order/Base/OrderLayout` |
| `Menu/MenuProductCard` | `Order/Features/Menu/MenuProductCard` |
| `Menu/MenuListScreen` | `Order/Screens/MenuListScreen` |
| `Cart/CartBar` | `Order/Features/Cart/CartBar` |
| `Cart/CartScreen`, `Cart/CartItemEditScreen` | `Order/Screens/CartScreen`, `Order/Screens/CartItemEditScreen` |
| `Order/TableResolveScreen` | `Order/Screens/TableResolveScreen` |
| `Checkout/CheckoutScreen` | `Order/Screens/CheckoutScreen` |

Sidebar root order is pinned in `.storybook/preview.tsx` so it does not fall back to alphabetical
(`Order` before `POS` before `Shared` would bury the biggest surface):

```ts
parameters: {
  options: {
    storySort: { order: ['POS', 'Order', 'Shared'] },
  },
},
```

The `stories` glob in `.storybook/main.ts` (`'../src/**/*.stories.@(ts|tsx)'`) needs no change —
it already covers every new location.

---

## 5. Decisions

### D1 — Three buckets under `presentation/`, not two

`presentation/{shared,pos,order}/`. `shared/` mirrors the app folders (`components/`,
`controllers/`) so there is one shape to learn, and so `shared/controllers/controller.ts` has an
obvious home.

*Rejected — `presentation/base/` hoisted to the top instead of `shared/components/base/`.* Shorter
paths (`../../base/Sheet/Sheet` vs `../../shared/components/base/Sheet/Sheet`), but it leaves
`controller.ts` homeless and implies "shared" means "components" forever.

*Rejected — put shared components under `pos/` and let `order/` import them.* That is the leak in
§1.1 with a folder around it, and it makes the lint rule in Phase 7 unwritable.

### D2 — POS-only primitives stay in `shared/base/` for now

`FloatingCartButton`, `PinnedActionBar`, `Navbar`, `Sidebar`, `Pagination`, `ListItem`, `Layout`,
`Form`, `Markdown`, `Tabs` and `Chart` currently have only POS consumers, but they are generic
primitives with no POS-domain knowledge, and the order app is still growing screens that will want
several of them. Moving them into `pos/` on today's usage would be churn we pay for twice.

`OrderLayout` and `SkeletonView` are different: `OrderLayout` renders the customer app's chrome and
`SkeletonView` exists for the menu list. Both move into `order/components/base/` (Phase 6).

### D3 — One Nx library, folders and barrels — not `libs/ui-pos` / `libs/ui-order` / `libs/ui-shared`

Separate Nx projects would give the boundary a first-class enforcer
(`@nx/enforce-module-boundaries` via `tags`, which is currently configured as a no-op:
`sourceTag: "*"` → `onlyDependOnLibsWithTags: ["*"]`). The cost is three `jest.config.ts`, three
`tsconfig{,.lib,.spec}.json`, three `.eslintrc.json`, three sets of Jest `moduleNameMapper` entries
(the 11 `__mocks__` aliases in `libs/ui/jest.config.ts` would have to be duplicated or hoisted), a
Storybook config that composes three projects, and a fourth `libs/ui-core` for `data`/`domain`/
`utils` — which is where nearly all the shared code actually is.

We get the same enforcement for one `.eslintrc.json` override (Phase 7):

```json
{
  "files": ["src/presentation/pos/**"],
  "rules": {
    "no-restricted-imports": ["error", { "patterns": [
      { "group": ["**/presentation/order/**", "../order/*", "../../order/*"],
        "message": "POS must not import from the order app. Shared code belongs in presentation/shared." }
    ]}]
  }
}
```

If the boundary later needs to be enforced across a package boundary too, splitting into Nx libs
stays available — this refactor is a prerequisite for it either way.

### D4 — Moves use `git mv`; import rewrites are scripted, never hand-edited

Phases 1–6 must produce diffs a reviewer can validate without reading 800 files. §6 defines the
procedure and the two commands that prove a PR contains nothing but renames and import-path edits.

### D5 — Keep explicit story titles; do not switch to path-derived auto-titles

Storybook can derive titles from paths via `stories: [{ directory, titlePrefix }]`, which would make
the folder split *be* the Storybook split and delete 165 `title:` lines. Rejected: auto-titles use
the on-disk path verbatim, so we would get `POS/components/transactions/TransactionList` — lowercase
segments, `components` where the sidebar says `Features` today, and no way to group `Menu` and `Cart`
under `Order/Features` without renaming folders to match. Explicit titles cost one `sed` per phase
and keep the sidebar readable.

### D6 — Story titles change, so permalinks change

Story IDs are derived from `title`, so every deep link into Storybook breaks. There is no
deprecation path for this and no consumer that pins one (the Storybook build is a static deploy —
see `docs/trd-storybook-vercel-deployment.md`). Accepted, called out here so it is not a surprise.

### D7 — Directories are renamed, native identifiers are not

`apps/mobile` → `apps/pos-mobile` changes the directory and the Nx project name. It does **not**
change `rootProject.name = 'Mobile'`, the `com.mobile` Android application id, the iOS bundle
identifier, or `apps/pos-mobile/ios/Mobile.xcworkspace`. Those identify the shipped app to the app
stores and to already-installed devices.

### D8 — `apps/order` becomes `apps/order-web`, and Vercel must be updated in the same window

Vercel builds the order app from a Root Directory setting that points at `apps/order`, using
`apps/order/vercel.json`'s `buildCommand` (`npx nx run order:build`). Both the directory and the
project name change in Phase 9. The Vercel dashboard change is not in the repo and cannot be part of
the PR — Phase 9's checklist makes it an explicit pre-merge step.

### D9 — Rename phases come last

The `apps/` rename touches CI, Docker, Vercel and every doc that links to a source path. Doing it
after the `libs/ui` split means a failure there is isolated from the split, and the split's phases
never have to reason about two sets of app names.

---

## 6. Cross-cutting mechanics every move phase follows

**1. Move with `git mv`, one directory or file list at a time.** Never `cp` + delete; rename
detection is what makes the diff reviewable.

**2. Rewrite imports with one rule.** For a subtree moved one level deeper:

> Every relative specifier that *leaves* the moved subtree gains one `../`. Specifiers that stay
> inside it are unchanged.

Concretely, for Phase 3 (`presentation/{components,controllers,screens}` → `presentation/pos/…`),
specifiers beginning `./`, `../components/`, `../controllers/` or `../screens/` are untouched, and
every other `../…` gains one level:

```bash
# inside the moved subtree only
files=$(git diff --cached --name-only --diff-filter=R | grep '^libs/ui/src/presentation/pos/')
perl -pi -e "
  s{(from\s+')\.\./(?!components/|controllers/|screens/)}{\$1../../}g;
" $files
```

Run `npx tsc -p libs/ui/tsconfig.lib.json --noEmit` after; it finds anything the rule missed.

**3. Prove the diff is only paths.** These two commands are the review contract:

```bash
# every moved file must show as a rename
git diff -M --stat HEAD~1 | grep -c '=>'

# the only content changes are import lines
git diff -M HEAD~1 -- 'libs/ui/**' \
  | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
  | grep -vE "^[+-].*(from '|require\(|title: ')" \
  | sort -u          # must print nothing
```

Put the output of both in the PR description.

**4. Keep the public surface byte-identical within the phase.** A move phase that also changes what
`@gatherloop-pos/ui` exports is two phases. Leave a re-export behind where needed and delete it in
the barrel phase.

**5. Green gate for every PR.**

```bash
npx nx run ui:lint && npx nx run ui:test
npx nx run ui:build-storybook
npx nx run web:build            # or pos-web:build, after Phase 8
npx nx run order:build          # or order-web:build, after Phase 9
```

E2E (`nx run web-e2e:e2e`, `nx run order-e2e:e2e`) runs on `main` and is the backstop; run it
locally for Phases 4, 8, 9 and 10, which touch composition roots or app wiring.

**6. One phase per PR, merged in order.** Two move phases in flight at once guarantees conflicts on
the same 400 files.

---

## 7. Phase plan

Thirteen PRs. Phases 1–7 are the `libs/ui` split; 8–10 the renames; 11–12 the cleanup.

| # | PR | Files moved | Import lines touched | Risk |
| ---: | --- | ---: | ---: | --- |
| 1 | `presentation/shared/` | 80 | ~130 | low |
| 2 | `presentation/order/` (components, controllers, screens) | 42 | ~90 | low |
| 3 | `presentation/pos/` (components, controllers, screens) | 505 | ~560 | medium (size) |
| 4 | `app/` → `presentation/{pos,order}/app/` | 66 | ~200 | medium |
| 5 | Barrels + `@gatherloop-pos/ui/pos` | 0 | ~65 | medium |
| 6 | `OrderLayout` + `SkeletonView` → `order/components/base/` | 3 | ~6 | low |
| 7 | Lint guardrail + Storybook sort | 0 | 0 | low |
| 8 | `web`/`web-e2e` → `pos-web`/`pos-web-e2e` | 96 | 0 | medium (Docker/CI) |
| 9 | `order`/`order-e2e` → `order-web`/`order-web-e2e` | 36 | 0 | medium (Vercel) |
| 10 | `mobile`/`mobile-e2e` → `pos-mobile`/`pos-mobile-e2e` | 80 | 0 | medium (native) |
| 11 | Docs and architecture refresh | 0 | 0 | low |
| 12 | Delete transitional re-exports | 0 | ~0 | low |

---

### Phase 1 — Extract `presentation/shared/`

**Why first:** both app buckets depend on it, so moving it first means every later phase's import
fix-up is final rather than a step toward one.

**Moves**

```
presentation/components/base/          → presentation/shared/components/base/
presentation/controllers/controller.ts → presentation/shared/controllers/controller.ts
```

**Also**

- New `presentation/shared/index.ts` → `export * from './components/base'; export * from './controllers/controller';`
- `presentation/components/index.ts`: `export * from './base'` → `export * from '../shared/components/base'`
  (keeps `@gatherloop-pos/ui`'s surface identical — deleted in Phase 12).
- `presentation/controllers/index.ts`: same treatment for `./controller`.
- Retitle 25 stories `Base/X` → `Shared/Base/X`:
  ```bash
  grep -rl "title: 'Base/" libs/ui/src | xargs sed -i "s|title: 'Base/|title: 'Shared/Base/|"
  ```
- `libs/ui/src/index.ts`: `./presentation/components/base/ConfirmationAlert` →
  `./presentation/shared/components/base/ConfirmationAlert`.
- `libs/ui/src/index.order.ts`: same for `ConfirmationAlert`, `LoadingView`, `OrderLayout`.

**Done when:** `ui:lint`, `ui:test`, `ui:build-storybook`, `web:build`, `order:build` pass;
`git diff -M --stat` shows 80 renames; the content-diff check in §6.3 is empty apart from the 25
`title:` lines.

---

### Phase 2 — Create `presentation/order/`

**Moves** (the 42 non-`app/` files from §3.1)

```
presentation/screens/{TableResolve,MenuList,MenuItemDetail}{Screen,Handler}.tsx  ┐
presentation/screens/{CartScreen,CartHandler,CartItemEditScreen}.tsx             ├→ presentation/order/screens/
presentation/screens/Checkout{Screen,Handler}.tsx                                │
  + their .stories.tsx and .test.tsx                                             ┘
presentation/controllers/{TableResolve,MenuList,MenuItemDetail,Cart}Controller.tsx
                                                                                 → presentation/order/controllers/
presentation/components/menu/                                                    → presentation/order/components/menu/
presentation/components/cart/                                                    → presentation/order/components/cart/
```

**Import rewrites** (moved files only)

| Was | Becomes |
| --- | --- |
| `../components/base/…` | `../../shared/components/base/…` |
| `../components/{menu,cart}/…` | `../components/{menu,cart}/…` (unchanged) |
| `../controllers/…` | `../controllers/…` (unchanged) |
| `../../{domain,utils,data}/…` | `../../../{domain,utils,data}/…` |
| `../../../.storybook/mocks/mockData` | `../../../../.storybook/mocks/mockData` |

**Also**

- `presentation/components/index.ts`: drop `export * from './menu'` and `'./cart'` — this is the leak
  from §1.1 closing, and it is the one place in this phase where `@gatherloop-pos/ui`'s surface
  actually shrinks. Verify nothing in `apps/` imported `MenuItemThumbnail` et al. from the root
  barrel (it does not — `index.order.ts` is the only consumer, and it gets a deep path).
- New `presentation/order/index.ts` exporting `./components/menu`, `./components/cart`,
  `./controllers`, `./screens`.
- `index.order.ts` points its component/screen lines at `./presentation/order/…`.
- Retitle 13 stories:
  ```bash
  sed -i "s|title: 'Menu/\(MenuListScreen\|MenuItemDetailScreen\)|title: 'Order/Screens/\1|;
          s|title: 'Menu/|title: 'Order/Features/Menu/|;
          s|title: 'Cart/\(CartScreen\|CartItemEditScreen\)|title: 'Order/Screens/\1|;
          s|title: 'Cart/|title: 'Order/Features/Cart/|;
          s|title: 'Order/TableResolveScreen|title: 'Order/Screens/TableResolveScreen|;
          s|title: 'Checkout/|title: 'Order/Screens/|" \
      $(grep -rl "title: '\(Menu\|Cart\|Order\|Checkout\)/" libs/ui/src)
  ```
  (`Base/OrderLayout` is still `Shared/Base/OrderLayout` at this point; Phase 6 fixes it.)

**Verify by hand:** `npx nx dev order`, walk `/t/{code}` → menu → item detail → add to cart → cart →
edit line → checkout.

---

### Phase 3 — Create `presentation/pos/`

The bulk move, and the one that needs the §6 discipline most.

**Moves**

```
presentation/components/   → presentation/pos/components/
presentation/controllers/  → presentation/pos/controllers/
presentation/screens/      → presentation/pos/screens/
```

**Import rewrite:** exactly the single rule in §6.2 — specifiers starting `./`, `../components/`,
`../controllers/` or `../screens/` unchanged; every other `../` gains one level. That covers
`../../domain` (185 sites), `../../utils/testUtils` (57), `../../data/mock` (57),
`../../../.storybook/mocks/mockData` (30) and `../shared/…` (introduced in Phase 1).

**Also**

- `presentation/index.ts` becomes `export * from './pos';` (transitional; deleted in Phase 12).
- New `presentation/pos/index.ts` → `export * from './controllers'; export * from './components'; export * from './screens';`
  — i.e. today's `presentation/index.ts`, relocated. `./app` joins it in Phase 4.
- `libs/ui/src/app/*` still import `from '../presentation'`, which still resolves. Unchanged here
  on purpose: 56 files stay untouched so this phase is a pure move.
- Retitle 127 stories (78 `Features/`, 49 `Screens/`):
  ```bash
  grep -rl "title: '\(Features\|Screens\)/" libs/ui/src \
    | xargs sed -i "s|title: 'Features/|title: 'POS/Features/|; s|title: 'Screens/|title: 'POS/Screens/|"
  ```

**Why this is not four smaller PRs (one per layer):** POS screens import `../components` (97 sites)
and `../controllers` (63 sites). Moving one layer at a time would rewrite those to `../../components`
and then back to `../components` when the sibling follows — churn that *adds* review surface while
pretending to reduce it. Moving the three siblings together keeps every intra-bucket path invariant
and reduces the whole PR to one uniform rule. Size is handled by the §6.3 proof, not by splitting.

---

### Phase 4 — Move the composition roots

**Moves**

```
src/app/{SessionProvider,CartProvider,TableResolve,MenuList,MenuItemDetail,Cart,CartItemEdit,Checkout}.tsx
  (+ CartItemEdit.test.tsx)              → presentation/order/app/
src/app/  (remaining 57, incl. index.ts) → presentation/pos/app/
```

**Import rewrites** — two rules, because `app/` had a different depth *and* referenced
`presentation/` by name:

| Was | Becomes |
| --- | --- |
| `../presentation` | `../screens` (all 56 sites import only `*Handler` — verified §3.4) |
| `../presentation/screens/X` | `../screens/X` |
| `../presentation/controllers/X` | `../controllers/X` |
| `../presentation/components/cart/CartBar` | `../components/cart/CartBar` |
| `../{data,domain,utils,config}/…` | `../../../{data,domain,utils,config}/…` |
| `./CartProvider`, `./SessionProvider` | unchanged |

**Also**

- `presentation/pos/index.ts` and `presentation/order/index.ts` each add `export * from './app';`.
- `libs/ui/src/index.ts`: `export * from './app'` → `export * from './presentation/pos'`.
- `index.order.ts`: the eight `./app/*` lines → `./presentation/order/app/*` (or simply
  `export * from './presentation/order'`, which is where Phase 5 takes it anyway).
- `src/app/` is now empty and is deleted.

**Watch for:** `app/index.ts` is the file that decides `@gatherloop-pos/ui`'s composition-root
surface. It moves verbatim — it must still omit the order roots after the move, or Phase 5's barrel
work will silently re-add them.

**Verify by hand:** `nx dev web` (login, product list, transaction create → pay), `nx dev order`
(full flow), `nx run-android` or `nx run-ios` smoke.

---

### Phase 5 — Split the barrels and add `@gatherloop-pos/ui/pos`

The phase that delivers "the barrel export will be smaller".

**`tsconfig.base.json`**

```json
"@gatherloop-pos/ui":       ["libs/ui/src/index.ts"],
"@gatherloop-pos/ui/pos":   ["libs/ui/src/index.pos.ts"],
"@gatherloop-pos/ui/order": ["libs/ui/src/index.order.ts"]
```

**New `libs/ui/src/index.pos.ts`** → `export * from './presentation/pos';`
**`libs/ui/src/index.order.ts`** collapses to `export * from './presentation/order';` plus the
handful of shared re-exports the order app still pulls from it (`config`, `utils/currency`,
`ConfirmationAlert`, `LoadingView`) — or, better, those move to `@gatherloop-pos/ui` imports in
`apps/order` and `index.order.ts` becomes a one-liner.

**`libs/ui/src/index.ts`** shrinks to shared only:

```ts
export * from './config';
export * from './data';
export * from './domain';
export * from './utils';
export * from './presentation/shared';
```

**Consumer updates** — 56 files, mechanically splittable because the symbol sets are disjoint
(composition roots and `*Props` live in `pos`; repositories, `getUrlFromCtx`, entities and
`DEFAULT_*` constants live in the root):

- `apps/web/src/pages/**` — 55 files, one or two import statements each.
- `apps/mobile/src/app/App.tsx` — one large import split in two.
- `apps/order/src/**` — 9 files; only the ones importing shared helpers change.

**Split this PR if review gets heavy:** 5a adds the entry points and leaves the root barrel
re-exporting `./presentation/pos` (purely additive, nothing breaks); 5b migrates `apps/web`; 5c
migrates `apps/mobile` and `apps/order`; 5d shrinks the root barrel. 5d is the one that can break a
build, and by then it is a two-line diff.

**Jest note:** `libs/ui/jest.config.ts` maps by relative path and needs no change.
`apps/web/jest.config.ts` and `apps/mobile/jest.config.ts` resolve workspace paths through
`@nx/jest`'s resolver, which reads `tsconfig.base.json` — the new `/pos` key is picked up
automatically, same as `/order` is today. Confirm with `nx run web:test` and `nx run mobile:test`.

---

### Phase 6 — Move the two order-only base components

```
presentation/shared/components/base/OrderLayout.tsx        → presentation/order/components/base/
presentation/shared/components/base/OrderLayout.stories.tsx → presentation/order/components/base/
presentation/shared/components/base/SkeletonView.tsx       → presentation/order/components/base/
```

Drop both from `shared/components/base/index.tsx`, add an `order/components/base/index.ts`, retitle
`Shared/Base/OrderLayout` → `Order/Base/OrderLayout`, and repoint the three importers
(`TableResolveScreen`, `CartScreen`, `MenuListScreen`) plus `index.order.ts`.

Small on purpose: it is the first PR where the folder structure lets us *notice* a misplaced file,
and it is worth landing separately so that fact is visible in the history.

---

### Phase 7 — Enforce the boundary

**`libs/ui/.eslintrc.json`** — two `no-restricted-imports` overrides (the POS one is shown in D3;
the order one is its mirror), alongside the existing `controllers/**` override, whose `files` glob
becomes `src/presentation/*/controllers/**`.

**`libs/ui/.storybook/preview.tsx`** — add the `storySort` from §4.2.

**Optional, recommended:** a fourth override forbidding
`presentation/shared/**` from importing `../pos/**` or `../order/**`, so "shared" cannot quietly
acquire an app dependency.

**Done when:** a deliberately added `import { MenuProductCard } from '../../order/components/menu'`
inside a POS screen fails `nx run ui:lint`. Include that check's output in the PR description, then
remove the line.

---

### Phase 8 — `web` → `pos-web`, `web-e2e` → `pos-web-e2e`

```bash
git mv apps/web apps/pos-web
git mv apps/web-e2e apps/pos-web-e2e
```

| File | Change |
| --- | --- |
| `apps/pos-web/project.json` | `name: "pos-web"`, `sourceRoot: "apps/pos-web"` |
| `apps/pos-web/package.json` | `"name": "pos-web"` (was the stale `"web2"`) |
| `apps/pos-web/jest.config.ts` | `displayName: 'pos-web'`, `coverageDirectory: '../../coverage/apps/pos-web'` |
| `apps/pos-web/Dockerfile` | `nx run pos-web:build`; `COPY --from=build /app/apps/pos-web/.next ./.next` |
| `apps/pos-web-e2e/project.json` | `name`, `sourceRoot`, `implicitDependencies: ["pos-web"]` |
| `apps/pos-web-e2e/playwright.config.ts` | `command: 'npx nx dev pos-web'` |
| `.github/workflows/e2e-main.yml` | matrix entry `web-e2e` → `pos-web-e2e`; the comment naming `nx dev web` |
| `README.md` | `.env.local` copy instructions and the project table |
| `E2E_TEST_PLAN.md`, `TESTING_REVIEW.md`, `docs-site/**` | path references |

**Out of repo:** whatever host builds the POS web image runs `docker build` against
`apps/web/Dockerfile`. Update that path in the host's settings **before** merging, or the next
deploy 404s on the Dockerfile.

`apps/pos-web/.env.local` is gitignored and lives on developer machines — call the rename out in the
PR description so nobody spends an afternoon on a missing env file.

---

### Phase 9 — `order` → `order-web`, `order-e2e` → `order-web-e2e`

Same shape as Phase 8, plus:

| File | Change |
| --- | --- |
| `apps/order-web/vercel.json` | `npx nx run order-web:build` |
| `apps/order-web-e2e/playwright.config.ts` | `npx nx run order-web:build && npx nx run order-web:start` |
| `docs-site/sales/table-ordering.md` | `apps/order` → `apps/order-web` |
| `docs/trd-order-app-nextjs-migration.md` | add a note that the app moved; do not rewrite history |

**Out of repo, before merge:** change the Vercel project's **Root Directory** from `apps/order` to
`apps/order-web`. A Vercel build against a missing root directory fails the deployment, and printed
QR codes point at that deployment — so sequence it as: update Vercel Root Directory → merge → verify
the next deploy → scan a printed QR code.

---

### Phase 10 — `mobile` → `pos-mobile`, `mobile-e2e` → `pos-mobile-e2e`

```bash
git mv apps/mobile apps/pos-mobile
git mv apps/mobile-e2e apps/pos-mobile-e2e
```

`project.json` (both), `jest.config.ts` (`displayName`, `coverageDirectory`),
`apps/pos-mobile/package.json` `"name"`, and the `docs-site` references.

**Explicitly unchanged** (D7): `android/settings.gradle`'s `rootProject.name = 'Mobile'`, the
`com.mobile` package and its `java/com/mobile/**` directory, `ios/Mobile.xcworkspace`,
`ios/Mobile/Info.plist`, and every `../../../../node_modules/**` path in `android/app/build.gradle`
— the rename keeps the directory depth identical, so those resolve unchanged.

**Verify:** `nx run pos-mobile:test`, then a real `nx run-android` (or `run-ios`) build. Metro
resolves through `withNxMetro` and the workspace root, so a successful bundle is the proof. Delete
`apps/pos-mobile/android/app/build` and any local Metro cache first — stale absolute paths from the
old directory are the one plausible failure mode.

---

### Phase 11 — Documentation refresh

- `README.md`: the project list and the `libs/ui` structure section (currently describes
  `libs/ui/src/app` as the composition layer).
- `docs-site/under-the-hood/clean-architecture.md`: the `libs/ui/src/app` link and the "App
  composition" paragraph.
- `docs-site/under-the-hood/cross-platform.md` and `architecture.md`: the `apps/web` / `apps/mobile`
  table, the diagram, and the `libs/ui/src/app` references.
- `docs-site/under-the-hood/testing-strategy.md`: `apps/web-e2e` links.
- This TRD: **Status: done**, with the merged PR numbers per phase.

---

### Phase 12 — Delete the transitional re-exports

Remove `presentation/index.ts`, the `export * from '../shared/components/base'` line left in
`presentation/pos/components/index.ts` by Phase 1, and any other compatibility shim the earlier
phases left behind. Confirm `grep -rn "presentation'" libs apps` returns nothing.

---

## 8. What each PR should look like

- **Title:** `refactor(ui): <phase title>` — commitlint enforces conventional commits.
- **Body:** the phase number and its §7 row; the two §6.3 verification outputs; the green-gate
  command list with results; for Phases 2, 4, 8, 9 and 10, the manual verification actually
  performed.
- **Reviewer's job** on a move phase is to check three things, not 800 files: (a) `--stat` shows
  renames, not add+delete; (b) the content-diff filter is empty; (c) the barrel and `title:` changes
  are the ones the phase says they are.
- **No opportunistic edits.** A component that should be renamed, a story that should be split, a
  dead export — write it down, land it separately. A move PR with one real change in it loses the
  §6.3 proof and becomes unreviewable.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| **Phase 3 is ~500 files.** Reviewers rubber-stamp it. | The §6.3 proof is the review. Both commands' output goes in the PR body; if the content-diff filter is non-empty, the PR is wrong by construction. |
| **A `.native.ts` / `.native.tsx` platform variant gets orphaned.** Metro resolves them by filename, and `tsc` never type-checks them against the web build. | 11 such files exist (§3.1 audit lists them as reachable from neither entry point). Move them explicitly with their siblings and grep for `\.native\.` in every move phase's file list. Phase 10's real device build is the backstop. |
| **Jest `moduleNameMapper` breaks.** 11 `__mocks__` aliases are keyed by module name, not path. | None are path-based, so the moves cannot break them. `ui:test` in every green gate confirms it. |
| **Storybook permalinks break** (D6). | Accepted. Announce once when Phase 3 merges. |
| **Vercel Root Directory** (D8) is out of repo and easy to forget. | Phase 9's checklist sequences the dashboard change before the merge, and the merge before the QR-code check. |
| **`apps/web/.env.local` and `apps/mobile/.env` are gitignored** and do not move with `git mv`. | Called out in the Phase 8 and 10 PR descriptions. |
| **Someone lands a new screen mid-refactor**, into the old location. | Phases are short; merge them back to back. Phase 7's lint rule prevents the class of mistake permanently, but only from Phase 7 onward. |
| **Native build picks up a stale absolute path.** | Phase 10 deletes `android/app/build` and the Metro cache before verifying. |

---

## 10. Definition of done

1. `libs/ui/src/presentation` contains exactly `shared/`, `pos/` and `order/`, and no `.tsx` file
   sits directly under `presentation/`.
2. `libs/ui/src/app` no longer exists.
3. `nx run ui:lint` fails on a POS→order or order→POS import.
4. Storybook's sidebar has three roots — `POS`, `Order`, `Shared` — in that order, and all 165
   stories are under one of them.
5. `@gatherloop-pos/ui` exports no composition root; `@gatherloop-pos/ui/pos` and
   `@gatherloop-pos/ui/order` each export exactly one app's presentation layer.
6. `nx show projects` lists `pos-web`, `pos-web-e2e`, `pos-mobile`, `pos-mobile-e2e`, `order-web`,
   `order-web-e2e`, `api`, `ui`, `provider`, `api-contract`.
7. `nx run-many --target=lint,test --all` and both Playwright suites are green on `main`.
8. The POS web deploy, the order Vercel deploy and the Storybook deploy have each succeeded once
   after their rename phase.
9. No behavioural diff: no PR in phases 1–7 changed a file outside an import statement, a barrel, a
   Storybook `title`, or a config that names a path.

---

## 11. Open questions

1. **Should `domain/` and `data/` split too?** The order app owns four usecases, four repository
   interfaces and five data implementations outright (§2, Non-goals). Splitting them would make the
   app boundary total rather than presentation-only, at roughly Phase 3's cost again. Recommend
   revisiting once the presentation split has been lived in for a release.
2. **Should `shared/` be promoted to `libs/ui-shared`?** D3 says not now. If a third product surface
   appears, the calculus changes.
3. **`FloatingCartButton` and `PinnedActionBar` have only POS consumers today** (D2). If the order
   app has not adopted either by the time Phase 12 lands, move them into `pos/components/base/` as a
   thirteenth phase.
4. **Does anything outside this repo deep-link into Storybook?** If the docs site or a design handoff
   pins story URLs, D6 needs a redirect map rather than an announcement.

---

## References

- `docs/trd-order-app-nextjs-migration.md` — D6 (`@gatherloop-pos/ui/order` exists and why), D20
- `docs/prd-table-ordering.md` — D14, D17, D20, D22 (the order app's composition roots)
- `docs/trd-form-ownership-refactor.md` — the phase-per-PR format this TRD follows
- `docs/trd-storybook-vercel-deployment.md` — how Storybook ships
- `docs-site/under-the-hood/clean-architecture.md` — the layer contract this refactor preserves
