# TRD — Split `libs/ui` composition and screens by app, and rename the app projects

**Status:** proposed
**Scope:** `libs/ui/src/app`, `libs/ui/src/presentation/screens`, `libs/ui/src/index*.ts`, `libs/ui/.storybook`, `tsconfig.base.json`, `apps/{web,web-e2e,order,order-e2e,mobile,mobile-e2e}` (directory + Nx project names only), and the CI/deploy configs that name those projects
**Non-scope:** `libs/ui/src/{domain,data,utils}`, `libs/ui/src/presentation/{components,controllers}`, `libs/api-contract`, `libs/provider`, `apps/api`, any runtime behaviour, any component API, native bundle identifiers
**Date of research:** 2026-09-07 (all counts measured against `main` @ `91d5451`)

---

## 1. Problem statement

`libs/ui` serves three deployable frontends — the POS web app (`apps/web`), the POS mobile app
(`apps/mobile`) and the customer ordering app (`apps/order`) — from one flat tree:

```
libs/ui/src/
  app/                       66 files   ← every composition root, POS and order together
  presentation/
    components/             298 files
    controllers/             87 files
    screens/                242 files   ← every screen, POS and order together
  data/  domain/  utils/  config.ts
```

Nothing in the layout says which app a file serves. The separation exists, but it is carried
entirely by two hand-maintained barrels and a comment:

```ts
// libs/ui/src/index.order.ts
// The root barrel (./index.ts) re-exports ./app, which pulls in every POS
// composition root. Next bundles per page, so importing the root barrel from
// the order app would drag the whole POS into the customer's first load —
// this barrel stays POS-free so it doesn't.
```

Three concrete costs:

**1.1 The boundary is a convention, not a constraint.** `app/index.ts` deliberately omits the eight
order composition roots and `presentation/screens/index.ts` deliberately omits the order screens.
Nothing enforces either omission. One `export * from './MenuListScreen'` added to the screens barrel
silently pulls the customer app's menu into `@gatherloop-pos/ui`, and only a bundle-size review
nobody runs would notice.

**1.2 Storybook is organised by nothing in particular.** All 165 stories set an explicit `title`, and
those titles have accreted seven top-level namespaces:

| Top level | Stories | What it actually is |
| --- | ---: | --- |
| `Features/…` | 78 | POS components, grouped by domain |
| `Screens/…` | 49 | POS screens, grouped by domain |
| `Base/…` | 25 | Shared primitives |
| `Menu/…` | 7 | 5 order components **and** 2 order screens |
| `Cart/…` | 4 | 2 order components **and** 2 order screens |
| `Order/…` | 1 | `TableResolveScreen` |
| `Checkout/…` | 1 | `CheckoutScreen` |

A reviewer cannot ask Storybook "show me the customer ordering app" — its 13 stories are spread over
five roots, two of which mix components with screens.

**1.3 The root barrel cannot be split.** `libs/ui/src/index.ts` re-exports `./app` — 56 composition
roots — alongside all of `./data`, `./domain`, `./utils` and `./config`. Every one of the 56
`apps/web`/`apps/mobile` import sites resolves that whole surface, and `index.order.ts` exists purely
to *not* be it. Every new customer-app screen must be hand-added to that second barrel, a step whose
omission fails only at the app, never in `libs/ui`.

**1.4 The `apps/` names no longer describe the apps.** `web` and `mobile` are both POS clients;
`order` is the customer app and is also a web app. The names predate the customer app.

---

## 2. Goals and non-goals

### Goals

1. Composition roots and screens live under a folder that names the app they serve.
2. Each app gets its own entry point, and the root barrel carries no app-specific code.
3. Storybook groups screens by app, and every story title is reconstructible from its file path.
4. A cross-app import between screens, or between composition roots, fails lint.
5. `apps/` directories and Nx project names become `pos-web`, `pos-web-e2e`, `pos-mobile`,
   `pos-mobile-e2e`, `order-web`, `order-web-e2e`.
6. Every phase is one reviewable PR that leaves `nx run-many --target=lint,test --all` and both
   Playwright suites green.

### Non-goals

- **No behaviour change.** Every diff in phases 1–5 is a path, a barrel line, a Storybook `title`, or
  a config that names a path. No component API, prop, state machine or rendered output changes.
- **`domain/`, `data/` and `utils/` are not touched** — see D2.
- **`presentation/components/` and `presentation/controllers/` are not touched** — see D3 and D4.
- **No new Nx libraries** — see D8.
- **No native identifier changes.** `apps/mobile` → `apps/pos-mobile` renames the *directory*.
  `rootProject.name = 'Mobile'`, the `com.mobile` Android package, the iOS bundle id and
  `ios/Mobile.xcworkspace` stay exactly as they are.
- **No test rewrites.** Tests move with their subject; their content changes only where an import
  path does.

---

## 3. Current-state audit

### 3.1 Which files belong to which app

Measured by resolving imports at the symbol level (the `domain/index.ts` and `data/index.ts` barrels
make a naive reachability walk report almost everything as shared) and confirming each candidate's
direct importers.

**Order-owned — 31 files:**

| Layer | Files |
| --- | --- |
| `app/` (9) | `SessionProvider`, `CartProvider`, `TableResolve`, `MenuList`, `MenuItemDetail`, `Cart`, `CartItemEdit` (+ `CartItemEdit.test.tsx`), `Checkout` |
| `presentation/screens/` (22) | `TableResolve{Screen,Handler}`, `MenuList{Screen,Handler}`, `MenuItemDetail{Screen,Handler}`, `CartScreen`, `CartHandler`, `CartItemEditScreen`, `Checkout{Screen,Handler}` + their `.stories.tsx` / `.test.tsx` |

**POS-owned:** the remaining 57 `app/` files (56 roots + `index.ts`) and 220 `screens/` files.

`presentation/components/` and `presentation/controllers/` also divide cleanly by current usage —
19 POS domain folders vs. `menu/` + `cart/`; 83 POS controllers vs. 4 — but they are deliberately
left flat (D3, D4).

### 3.2 Composition roots are shared across *platforms*, not apps

Of the 56 roots in `app/index.ts`, **53 are imported by both `apps/web` and `apps/mobile`**; none is
web-only; one is mobile-only. `apps/web/src/pages/products/index.tsx` is literally
`export default ProductList`, and `apps/mobile/src/app/App.tsx` mounts the same `ProductList`.

This is why the roots cannot move into `apps/` (D6): `apps/pos-web` and `apps/pos-mobile` are not two
applications, they are two platform shells around one, and the composition root is the thing they
share.

### 3.3 Import churn the moves cost

| Measure | Count |
| --- | ---: |
| Relative import lines under `app/` | 196 across 65 files |
| `app/` files importing `from '../presentation'` | 56 — **all** import only `*Handler` symbols |
| Import lines under `screens/` reaching `../../domain` | 185 |
| … `../../utils/testUtils` | 57 |
| … `../../data/mock` | 57 |
| … `../../../.storybook/mocks/mockData` | 30 |
| … `../components` (barrel or deep) | 97 |
| … `../controllers` | 63 |
| `apps/` files importing `@gatherloop-pos/ui` | 56 (55 `apps/web` pages + `apps/mobile/src/app/App.tsx`) |
| `apps/` files importing `@gatherloop-pos/ui/order` | 9 |
| Stories with an explicit `title` | 165 of 165 |

All mechanical. §6 defines the rewrite rule and the verification that proves a PR contains nothing
but it.

### 3.4 What names the app projects today

| Where | Reference |
| --- | --- |
| `apps/*/project.json` | `name`, `sourceRoot`, `implicitDependencies` |
| `apps/web/jest.config.ts`, `apps/mobile/jest.config.ts` | `displayName`, `coverageDirectory` |
| `apps/web-e2e/playwright.config.ts` | `webServer.command: 'npx nx dev web'` |
| `apps/order-e2e/playwright.config.ts` | `'npx nx run order:build && npx nx run order:start'` |
| `apps/web/Dockerfile` | `npx nx run web:build`, `COPY --from=build /app/apps/web/.next` |
| `apps/order/vercel.json` | `npx nx run order:build` |
| `.github/workflows/e2e-main.yml` | matrix `project: [web-e2e, order-e2e]`, artifact path `dist/.playwright/apps/${{ matrix.project }}` |
| `apps/web/package.json` | `"name": "web2"` — already wrong; fix while we are here |
| `README.md`, `docs-site/**`, `E2E_TEST_PLAN.md`, `TESTING_REVIEW.md` | prose and links |

Native build files under `apps/mobile/{android,ios}` reference `node_modules` only by *relative*
depth (`../../../../node_modules/react-native`). `apps/mobile` → `apps/pos-mobile` keeps that depth
identical, so none of them change.

**Out of repo, therefore manual:** the Vercel project's Root Directory for the order app, and the
POS web host's Dockerfile path. Both are named in the phases that need them.

---

## 4. Target architecture

```
libs/ui/src/
  config.ts  config.native.ts        unchanged
  data/                              unchanged
  domain/                            unchanged
  utils/                             unchanged
  __mocks__/                         unchanged
  app/
    pos/          57 files — 56 composition roots + index.ts
    order/         9 files — SessionProvider, CartProvider, TableResolve, MenuList,
                             MenuItemDetail, Cart, CartItemEdit, Checkout + index.ts
  presentation/
    components/                      unchanged, including base/
    controllers/                     unchanged, including controller.ts
    screens/
      pos/        220 files, flat
      order/       22 files, flat
  index.ts        @gatherloop-pos/ui        → config, data, domain, utils (no app code)
  index.pos.ts    @gatherloop-pos/ui/pos    → app/pos
  index.order.ts  @gatherloop-pos/ui/order  → app/order + the shared pieces apps/order mounts directly
```

### 4.1 The rule that decides what splits

> **Split the layers that name one app's surface. Keep flat the layers that are building blocks.**

| Layer | | Why |
| --- | --- | --- |
| `app/` | **split** | A composition root wires exactly one app's dependency graph. `MenuList` cannot be a POS root. |
| `presentation/screens/` | **split** | A screen *is* a route in one app. `MenuListScreen` is `/t/{code}`. |
| `presentation/controllers/` | flat | Adapter for a usecase; usecases are flat (D4) |
| `presentation/components/` | flat | Building blocks, shared by default (D3) |
| `domain/`, `data/`, `utils/` | flat | One API, one contract, one business vocabulary (D2) |

### 4.2 Entry points

| Specifier | Exports | Consumed by |
| --- | --- | --- |
| `@gatherloop-pos/ui` | `./config`, `./data`, `./domain`, `./utils` | everything |
| `@gatherloop-pos/ui/pos` | `./app/pos` | `apps/pos-web`, `apps/pos-mobile` |
| `@gatherloop-pos/ui/order` | `./app/order` + `ConfirmationAlert`, `LoadingView`, `OrderLayout`, `MenuItemThumbnail`, `utils/currency`, `./config` | `apps/order-web` |

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

That is the point: the second line is the POS-specific part, and it now says so.

### 4.3 Storybook

Titles stay explicit (D9), and every one is derived from its file path:

> **Title = the path under `presentation/`, layer segment capitalised, collapsing a folder whose
> name equals the file name.**

| File | Title |
| --- | --- |
| `components/base/EmptyView.stories.tsx` | `Components/Base/EmptyView` |
| `components/base/Sheet/Sheet.stories.tsx` | `Components/Base/Sheet` ← collapsed |
| `components/base/ConfirmationAlert/ConfirmationAlert.stories.tsx` | `Components/Base/ConfirmationAlert` ← collapsed |
| `components/base/Form/FormView.stories.tsx` | `Components/Base/Form/FormView` ← kept, names differ |
| `components/transactions/TransactionList.stories.tsx` | `Components/Transactions/TransactionList` |
| `components/menu/MenuProductCard.stories.tsx` | `Components/Menu/MenuProductCard` |
| `screens/pos/ProductListScreen.stories.tsx` | `Screens/POS/ProductListScreen` |
| `screens/order/MenuListScreen.stories.tsx` | `Screens/Order/MenuListScreen` |

The collapse rule is not an invention — today's titles already do it (`Base/Sheet`, not
`Base/Sheet/Sheet`) and already keep `Base/Form/FormView` because those two names differ.

Resulting sidebar:

```
Components
  Base                                        25   (Form/ nested, 11)
  Auth Budgets Calculations Cart Categories ChecklistTemplates Coupons
  Expenses Materials Menu Products Rentals StockChecks Suppliers Tables
  Tickets Transactions Variants Wallets       85
Screens
  POS                                         49   (flat)
  Order                                        6   (flat)
```

Sidebar order is pinned in `.storybook/preview.tsx` so it does not fall back to alphabetical:

```ts
parameters: { options: { storySort: { order: ['Components', 'Screens'] } } },
```

The `stories` glob in `.storybook/main.ts` (`'../src/**/*.stories.@(ts|tsx)'`) already covers every
new location and needs no change.

---

## 5. Decisions

### D1 — The app boundary is real at composition and screens, and false below them

There is one Go API, one generated `libs/api-contract`, and one business vocabulary. Entities,
repositories, transformers, usecases, controllers and components are all *building blocks* over that
single domain. What is genuinely per-app is the **route surface** (screens) and the **dependency
wiring** (composition roots). Everything in §4.1 follows from this one line.

### D2 — `domain/` and `data/` stay whole

The order app's `ApiMenuRepository` imports `toProduct`, `toCategory` and `toVariant` directly, which
transitively pulls `toMaterial` → `toSupplier` and the `Product` → `Category`, `Variant` → `Material`
→ `Supplier` entity chain. Five entities and five transformers are therefore used by both apps, not
by coincidence but because **the customer's menu is the POS's product catalog**.

More decisively, "no POS consumer today" is a usage fact, not a nature fact. `Cart.ts` has no POS
consumer right now; the first "waiter views the open cart on table 7" feature makes it shared. A
classification that one plausible feature invalidates is the wrong axis.

*Rejected — duplicate the shared files per app.* PR #275 ("Feat/order improvement") is the
counter-example: an **order** feature added a `recipe` field to `Product`, `Variant` and both
transformers, and every consumer of `recipe` today is **POS** (`ProductFormView`, `VariantFormView`,
`data/mock/product.ts`). Under duplication that is one feature requiring coordinated edits to four
files per app — and a missed copy **does not fail the build**, because `toProduct` constructs its
result field by field. Renames on the Go side would break both copies; *additions*, the common case,
fail silently in whichever copy you forgot. `api-contract` is regenerated from the Go OpenAPI spec
and HEAD is literally *"Add required API contract fields with sensible defaults (#388)"* — these
files sit on the seam every backend change crosses. Three of the repo's 55 commits touched them in
three weeks.

*Rejected — split `domain`/`data` by app without duplicating.* Same flip-flop problem as `Cart.ts`,
and the shared bucket would hold the files most likely to be edited.

*Recorded, not rejected — give order its own read-model.* If app independence ever becomes a hard
requirement, the honest form is order defining a narrower `MenuItem` type off `api-contract` directly
(~6 files), so the two transformers differ *on purpose*. That is a second API-shaped design task, out
of scope here.

### D3 — `presentation/components/` stays flat

Components divide cleanly by today's usage — and today's usage is also the evidence *against*
splitting them: when the order app was built it reused **5 of 5** relevant entities and transformers
wholesale, and **0 of 19** POS domain component folders, writing `menu/` and `cart/` from scratch and
reusing only 6 `base/` primitives. Verified in both directions today: no order surface imports a POS
domain component, and no POS surface imports `components/menu` or `components/cart`.

But a component carries no intrinsic app constraint — a future POS screen may legitimately want
`MenuProductCard`. Since the layer is declared shared, there is nothing to enforce, and `base/`
remains the place a component goes when both apps want it.

**Consequence, accepted deliberately:** with components flat there is no build-time tripwire on
accidental cross-app component reuse. That is the direct cost of "shared by default"; you cannot have
both. The enforceable rule shrinks to screens and composition roots (D10).

### D4 — `presentation/controllers/` stays flat

All 84 usecases map 1:1 to a controller. Since `domain/usecases/` stays flat (D2), splitting
`controllers/` would put the two halves of one pair under two different organising schemes —
`MenuListUsecase` flat in `domain/usecases/`, `useMenuListController` in `controllers/order/`.

Also worth recording: controllers are not strictly per-screen. 72 of 84 are used by exactly one
screen, but `AuthLogoutController` is used by **55**. "Per-app, and mostly per-screen" is the
accurate description, and it does not survive the D2 consistency test.

### D5 — `app/` is its own layer, not part of `presentation/`

A composition root instantiates the real repositories and usecases and renders a Handler — the
`main.go` of the app. `docs-site/under-the-hood/clean-architecture.md` already lists "App composition"
as the outermost layer, distinct from presentation. `app/` therefore stays a sibling of
`presentation/`, `domain/` and `data/`, split by app inside.

### D6 — Composition roots stay in `libs/ui`, not in `apps/`

53 of 56 are imported by both `apps/web` and `apps/mobile` (§3.2). Moving them into `apps/pos-web`
would force duplicating 53 files into `apps/pos-mobile`. Order could move its 8 (one platform), but
asymmetry there costs more clarity than it buys.

### D7 — Layer-major, not app-major

`presentation/screens/pos/`, not `presentation/pos/screens/`. Layer-major keeps shared code at each
layer's root — `components/base/` and `controllers/controller.ts` do not move at all — so no
`presentation/shared/` bucket has to be invented, named, or argued about. The cost is that an app's
code lives in two top-level folders (`app/<app>` and `presentation/screens/<app>`) rather than one.

### D8 — One Nx library, folders and barrels — not `libs/pos` / `libs/order` / `libs/ui`

Separate Nx projects would give the boundary a first-class enforcer (`@nx/enforce-module-boundaries`
via tags — currently configured as a no-op: `sourceTag: "*"` → `onlyDependOnLibsWithTags: ["*"]`) and
`nx affected` cache granularity. The costs: three `jest.config.ts` each carrying the 11
`moduleNameMapper` aliases plus the swc transform (and `src/__mocks__/` needs a home all three can
reach), three `tsconfig{,.lib,.spec}.json`, three `.eslintrc.json`, three `project.json`, three
`tsconfig.base` paths verified across four resolvers (Next web, Next order, Metro, Jest) — and a
fourth lib for `domain`/`data`/`utils`, which is where most of the shared code is.

The affected-cache benefit is also not realised today: `pr-test.yml` runs `npx nx run ui:test`
explicitly, not `nx affected`. A `no-restricted-imports` override (D10) gets the same enforcement for
direct imports at a fraction of the cost. If the boundary later needs enforcing across a package
boundary, this refactor is a prerequisite either way.

### D9 — Keep explicit story titles; do not switch to path-derived auto-titles

Storybook can derive titles via `stories: [{ directory, titlePrefix }]`, which would delete 165
`title:` lines. Rejected: auto-titles use the on-disk path verbatim, so we would get
`Components/base/transactions/…` — lowercase segments, no collapse of `Sheet/Sheet`, and no way to
capitalise `POS`. Explicit titles cost one `sed` and stay readable. §4.3's rule keeps them derivable
by hand.

### D10 — The lint guardrail covers screens and composition roots only

```json
{
  "files": ["src/app/pos/**", "src/presentation/screens/pos/**"],
  "rules": {
    "no-restricted-imports": ["error", { "patterns": [
      { "group": ["**/app/order/**", "**/screens/order/**"],
        "message": "POS must not import the order app's screens or composition roots." }
    ]}]
  }
}
```

…and its mirror for order. Components and controllers are shared by declaration (D3, D4), so there is
nothing to restrict there. The existing `src/presentation/controllers/**` override (banning
`react-hook-form` in controllers, per `docs/trd-form-ownership-refactor.md`) needs no change, because
`controllers/` does not move.

### D11 — `screens/pos/` is flat; story titles change, so permalinks change

220 files in one directory is the status quo, and the `<Domain><Action>Screen` naming already
self-groups alphabetically (`BudgetCreate/List/Update`, `ProductCreate/List/Update`, …). Adding a
domain level would turn a one-command `git mv` into a per-file classification with genuinely
ambiguous cases (`DashboardScreen`, `ExpenseStatisticScreen`, `TransactionStatisticScreen`,
`PurchaseListScreen`). If it ever grates, adding domain folders later is a pure `git mv` inside
`screens/pos/`.

Story IDs derive from `title`, so every deep link into Storybook breaks in Phase 3. There is no
deprecation path and no consumer that pins one (the Storybook build is a static deploy — see
`docs/trd-storybook-vercel-deployment.md`). Accepted; announce once when Phase 3 merges.

### D12 — Directories are renamed, native identifiers are not

Covered under Non-goals; restated here because it is the one rename mistake that would ship a
different app to the stores.

---

## 6. Cross-cutting mechanics every move phase follows

**1. Move with `git mv`, one file list at a time.** Never copy-and-delete; rename detection is what
makes the diff reviewable.

**2. Rewrite imports with one rule per phase.** For a subtree moved one level deeper:

> Every relative specifier that *leaves* the moved subtree gains one `../`. Specifiers that stay
> inside it are unchanged.

For Phase 2 (`presentation/screens` → `presentation/screens/{pos,order}`), specifiers beginning `./`
are untouched and every other `../…` gains one level:

```bash
files=$(git diff --cached --name-only --diff-filter=R | grep '^libs/ui/src/presentation/screens/')
perl -pi -e "s{(from\s+')\.\./}{\$1../../}g" $files
```

Then `npx tsc -p libs/ui/tsconfig.lib.json --noEmit` finds anything the rule missed.

**3. Prove the diff is only paths.** These two commands are the review contract:

```bash
# every moved file must show as a rename
git diff -M --stat HEAD~1 | grep -c '=>'

# the only content changes are import lines (and, in Phase 3, title lines)
git diff -M HEAD~1 -- 'libs/ui/**' \
  | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
  | grep -vE "^[+-].*(from '|require\(|title: ')" \
  | sort -u          # must print nothing
```

Put both outputs in the PR description.

**4. Keep the public surface byte-identical within a move phase.** A phase that also changes what
`@gatherloop-pos/ui` exports is two phases. Leave a re-export behind and delete it later.

**5. Green gate for every PR.**

```bash
npx nx run ui:lint && npx nx run ui:test
npx nx run ui:build-storybook
npx nx run web:build      # pos-web:build after Phase 6
npx nx run order:build    # order-web:build after Phase 7
```

E2E (`nx run web-e2e:e2e`, `nx run order-e2e:e2e`) runs on `main` and is the backstop; run it locally
for Phases 1, 4, 6, 7 and 8, which touch composition roots or app wiring.

**6. One phase per PR, merged in order.** Two move phases in flight guarantees conflicts on the same
files.

---

## 7. Phase plan

Nine PRs.

| # | PR | Files moved | Import lines | Risk |
| ---: | --- | ---: | ---: | --- |
| 1 | `app/{pos,order}` | 66 | ~200 | medium |
| 2 | `presentation/screens/{pos,order}` | 242 | ~400 | medium (size) |
| 3 | Storybook retitle + `storySort` | 0 | 0 (165 titles) | low |
| 4 | Barrels + `@gatherloop-pos/ui/pos` | 0 | ~65 | medium |
| 5 | Lint guardrail | 0 | 0 | low |
| 6 | `web`/`web-e2e` → `pos-web`/`pos-web-e2e` | 96 | 0 | medium (Docker/CI) |
| 7 | `order`/`order-e2e` → `order-web`/`order-web-e2e` | 36 | 0 | medium (Vercel) |
| 8 | `mobile`/`mobile-e2e` → `pos-mobile`/`pos-mobile-e2e` | 80 | 0 | medium (native) |
| 9 | Docs refresh | 0 | 0 | low |

---

### Phase 1 — `app/{pos,order}`

**Why first:** it is the phase that makes the barrel split possible, it is self-contained, and it is
invisible to `apps/` (the root barrel keeps exporting the POS roots).

**Moves**

```
app/{SessionProvider,CartProvider,TableResolve,MenuList,MenuItemDetail,Cart,Checkout}.tsx
app/CartItemEdit.tsx  app/CartItemEdit.test.tsx          → app/order/
app/  (remaining 56 roots + index.ts)                    → app/pos/
```

**Import rewrites in moved files**

| Was | Becomes |
| --- | --- |
| `../{data,domain,utils,config}/…` | `../../{data,domain,utils,config}/…` |
| `../presentation` (56 sites, all `*Handler`) | `../../presentation` |
| `../presentation/screens/X` | `../../presentation/screens/X` |
| `../presentation/components/cart/CartBar` | `../../presentation/components/cart/CartBar` |
| `./CartProvider`, `./SessionProvider` | unchanged |

**Also**

- `app/pos/index.ts` is the old `app/index.ts`, content unchanged. It must still omit the order
  roots — Phase 4's barrel work depends on it.
- New `app/order/index.ts` exporting the eight roots.
- `libs/ui/src/index.ts`: `export * from './app'` → `export * from './app/pos'`.
- `index.order.ts`: `./app/X` → `./app/order/X`.

**Verify by hand:** `nx dev web` (login → product list → transaction create → pay), `nx dev order`
(table → menu → item detail → add to cart → cart → edit line → checkout), and a mobile smoke run.

---

### Phase 2 — `presentation/screens/{pos,order}`

**Moves**

```
screens/{TableResolve,MenuList,MenuItemDetail}{Screen,Handler}.tsx
screens/{CartScreen,CartHandler,CartItemEditScreen}.tsx
screens/Checkout{Screen,Handler}.tsx
  + their .stories.tsx and .test.tsx                     → screens/order/   (22 files)
screens/  (remaining 220)                                → screens/pos/
```

**Import rewrite:** the single rule from §6.2 — `./` untouched, every other `../` gains one level.
That covers `../components` (97), `../controllers` (63), `../../domain` (185),
`../../utils/testUtils` (57), `../../data/mock` (57) and `../../../.storybook/mocks/mockData` (30).

**Also**

- `screens/index.ts` becomes `screens/pos/index.ts` (content unchanged — it already lists only POS
  screens); new `screens/order/index.ts` for the order screens.
- `presentation/index.ts`: `export * from './screens'` → `export * from './screens/pos'`. This is
  what keeps the 56 `app/pos/*` files importing `'../../presentation'` working with zero churn.
- Order's `app/order/*` files already deep-import their handlers; retarget those paths to
  `../../presentation/screens/order/X`.

**Not split by domain (D11):** `screens/pos/` is a flat directory of 220 files.

**Why this is not four smaller PRs:** POS screens import `../components` (97 sites) and
`../controllers` (63 sites). Splitting the move would rewrite those and then rewrite them back.
Moving the layer in one go reduces the whole PR to one uniform rule; size is handled by the §6.3
proof, not by splitting.

---

### Phase 3 — Storybook retitle

Pure title edits, no moves. Apply §4.3's rule to all 165 stories:

```bash
cd libs/ui/src/presentation
# POS screens: Screens/<Domain>/<Name> -> Screens/POS/<Name>
grep -rl "title: 'Screens/" screens/pos \
  | xargs sed -i -E "s|title: 'Screens/[A-Za-z]+/|title: 'Screens/POS/|"
# order screens
sed -i -E "s|title: '(Menu|Cart|Checkout|Order)/|title: 'Screens/Order/|" \
  screens/order/*.stories.tsx
# components
grep -rl "title: 'Features/" components | xargs sed -i "s|title: 'Features/|title: 'Components/|"
grep -rl "title: 'Base/"     components | xargs sed -i "s|title: 'Base/|title: 'Components/Base/|"
sed -i "s|title: 'Menu/|title: 'Components/Menu/|" components/menu/*.stories.tsx
sed -i "s|title: 'Cart/|title: 'Components/Cart/|" components/cart/*.stories.tsx
```

Add the `storySort` from §4.3 to `.storybook/preview.tsx`.

**Done when:** `nx run ui:build-storybook` succeeds and the sidebar has exactly two roots,
`Components` (110 stories) and `Screens` (55), matching §4.3's tree. Announce the permalink break
(D11).

---

### Phase 4 — Split the barrels and add `@gatherloop-pos/ui/pos`

**`tsconfig.base.json`**

```json
"@gatherloop-pos/ui":       ["libs/ui/src/index.ts"],
"@gatherloop-pos/ui/pos":   ["libs/ui/src/index.pos.ts"],
"@gatherloop-pos/ui/order": ["libs/ui/src/index.order.ts"]
```

**New `libs/ui/src/index.pos.ts`** → `export * from './app/pos';`

**`libs/ui/src/index.ts`** shrinks to:

```ts
export * from './config';
export * from './data';
export * from './domain';
export * from './utils';
export * from './presentation/components/base/ConfirmationAlert';
```

**`index.order.ts`** → `export * from './app/order';` plus its existing non-app re-exports
(`config`, `ConfirmationAlert`, `LoadingView`, `OrderLayout`, `MenuItemThumbnail`, `utils/currency`).

**Consumer updates** — 56 files, mechanically splittable because the symbol sets are disjoint
(composition roots and `*Props` → `/pos`; repositories, `getUrlFromCtx`, entities and `DEFAULT_*`
constants → root): 55 `apps/web` pages, one `apps/mobile/src/app/App.tsx`.

**Split this PR if review gets heavy:** 4a adds `index.pos.ts` and the tsconfig path while the root
barrel still re-exports `./app/pos` (purely additive, nothing breaks); 4b migrates `apps/web`; 4c
migrates `apps/mobile`; 4d removes `./app/pos` from the root barrel. Only 4d can break a build, and
by then it is a one-line diff.

**Jest note:** `libs/ui/jest.config.ts` maps by relative path — no change. `apps/web` and
`apps/mobile` resolve workspace paths through `@nx/jest`'s resolver, which reads
`tsconfig.base.json`, so the new `/pos` key is picked up the same way `/order` already is. Confirm
with `nx run web:test` and `nx run mobile:test`.

---

### Phase 5 — Lint guardrail

Add D10's two `no-restricted-imports` overrides to `libs/ui/.eslintrc.json`, alongside the existing
`controllers/**` override (unchanged).

**Done when:** a deliberately added `import { MenuListScreen } from '../order/MenuListScreen'` inside
a POS screen fails `nx run ui:lint`. Paste that output into the PR description, then remove the line.

---

### Phase 6 — `web` → `pos-web`, `web-e2e` → `pos-web-e2e`

```bash
git mv apps/web apps/pos-web
git mv apps/web-e2e apps/pos-web-e2e
```

| File | Change |
| --- | --- |
| `apps/pos-web/project.json` | `name: "pos-web"`, `sourceRoot: "apps/pos-web"` |
| `apps/pos-web/package.json` | `"name": "pos-web"` (was the stale `"web2"`) |
| `apps/pos-web/jest.config.ts` | `displayName`, `coverageDirectory: '../../coverage/apps/pos-web'` |
| `apps/pos-web/Dockerfile` | `nx run pos-web:build`; `COPY --from=build /app/apps/pos-web/.next ./.next` |
| `apps/pos-web-e2e/project.json` | `name`, `sourceRoot`, `implicitDependencies: ["pos-web"]` |
| `apps/pos-web-e2e/playwright.config.ts` | `command: 'npx nx dev pos-web'` |
| `.github/workflows/e2e-main.yml` | matrix `web-e2e` → `pos-web-e2e`, and the comment naming `nx dev web` |
| `README.md`, `E2E_TEST_PLAN.md`, `TESTING_REVIEW.md`, `docs-site/**` | paths and links |

**Out of repo, before merge:** update the POS web host's `docker build` Dockerfile path from
`apps/web/Dockerfile` to `apps/pos-web/Dockerfile`.

`apps/pos-web/.env.local` is gitignored and lives on developer machines — call the rename out in the
PR description.

---

### Phase 7 — `order` → `order-web`, `order-e2e` → `order-web-e2e`

Same shape, plus:

| File | Change |
| --- | --- |
| `apps/order-web/vercel.json` | `npx nx run order-web:build` |
| `apps/order-web-e2e/playwright.config.ts` | `npx nx run order-web:build && npx nx run order-web:start` |
| `docs-site/sales/table-ordering.md` | `apps/order` → `apps/order-web` |
| `docs/trd-order-app-nextjs-migration.md` | append a note that the app moved; do not rewrite history |

**Sequence, because Vercel is out of repo:** change the Vercel project's **Root Directory** from
`apps/order` to `apps/order-web` → merge → verify the next deployment → scan a printed QR code. A
Vercel build against a missing root directory fails the deployment, and printed QR codes point at it.

---

### Phase 8 — `mobile` → `pos-mobile`, `mobile-e2e` → `pos-mobile-e2e`

```bash
git mv apps/mobile apps/pos-mobile
git mv apps/mobile-e2e apps/pos-mobile-e2e
```

`project.json` (both), `jest.config.ts` (`displayName`, `coverageDirectory`),
`apps/pos-mobile/package.json` `"name"`, and the `docs-site` references.

**Explicitly unchanged (D12):** `android/settings.gradle`'s `rootProject.name = 'Mobile'`, the
`com.mobile` package and its `java/com/mobile/**` directory, `ios/Mobile.xcworkspace`,
`ios/Mobile/Info.plist`, and every `../../../../node_modules/**` path in `android/app/build.gradle` —
the rename keeps directory depth identical, so those resolve unchanged.

**Verify:** `nx run pos-mobile:test`, then a real `nx run-android` (or `run-ios`). Delete
`apps/pos-mobile/android/app/build` and the local Metro cache first — stale absolute paths from the
old directory are the one plausible failure mode.

---

### Phase 9 — Documentation refresh

- `README.md`: project list, `.env` copy instructions, and the `libs/ui` structure section.
- `docs-site/under-the-hood/clean-architecture.md`: the `libs/ui/src/app` link and the "App
  composition" paragraph.
- `docs-site/under-the-hood/cross-platform.md` and `architecture.md`: the `apps/web` / `apps/mobile`
  table, the diagram, and the `libs/ui/src/app` references.
- `docs-site/under-the-hood/testing-strategy.md`: `apps/web-e2e` links.
- This TRD: **Status: done**, with the merged PR numbers per phase.

---

## 8. What each PR should look like

- **Title:** `refactor(ui): <phase title>` — commitlint enforces conventional commits.
- **Body:** the phase number and its §7 row; both §6.3 verification outputs; the green-gate results;
  and for Phases 1, 6, 7 and 8, the manual verification actually performed.
- **Reviewer's job** on a move phase is three checks, not 300 files: (a) `--stat` shows renames, not
  add+delete; (b) the content-diff filter is empty; (c) the barrel and `title:` changes are the ones
  the phase says they are.
- **No opportunistic edits.** A component that should be renamed, a dead export, a story that should
  be split — write it down, land it separately. One real change inside a move PR forfeits the §6.3
  proof and makes it unreviewable.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| **Phase 2 is 242 files** and reviewers rubber-stamp it | The §6.3 proof *is* the review; both outputs go in the PR body. A non-empty content-diff filter means the PR is wrong by construction. |
| **A `.native.ts` / `.native.tsx` variant gets orphaned** — Metro resolves them by filename and `tsc` never checks them against the web build | `app/` contains none (verified); `screens/` contains none. Still grep for `\.native\.` in every move phase's file list, and Phase 8's device build is the backstop. |
| **Jest `moduleNameMapper` breaks** — 11 aliases in `libs/ui/jest.config.ts` | All are keyed by module name, not path, so the moves cannot affect them. `ui:test` in every green gate confirms it. |
| **Storybook permalinks break** (D11) | Accepted. Announce once when Phase 3 merges. |
| **Vercel Root Directory** is out of repo and easy to forget | Phase 7 sequences the dashboard change before the merge, and the merge before the QR check. |
| **`apps/web/.env.local` and `apps/mobile/.env` are gitignored** and do not move with `git mv` | Called out in the Phase 6 and 8 PR descriptions. |
| **A new screen lands mid-refactor** in the old location | Phases are short; merge back to back. Phase 5's lint rule prevents the class permanently, but only from Phase 5 onward. |
| **No tripwire on cross-app component reuse** (D3) | Accepted consequence of "components are shared by default". `base/` is the promotion target if a component becomes genuinely shared. |
| **Native build picks up a stale absolute path** | Phase 8 clears `android/app/build` and the Metro cache before verifying. |

---

## 10. Definition of done

1. `libs/ui/src/app` contains only `pos/` and `order/`; no `.tsx` file sits directly under it.
2. `libs/ui/src/presentation/screens` contains only `pos/` and `order/`; no `.tsx` file sits directly
   under it.
3. `libs/ui/src/presentation/{components,controllers}`, `domain/`, `data/` and `utils/` are unchanged
   from `91d5451` apart from import paths that had to follow a move.
4. `nx run ui:lint` fails on a POS→order or order→POS screen or composition-root import.
5. Storybook has exactly two roots — `Components` then `Screens` — and every one of the 165 titles is
   reconstructible from its file path by §4.3's rule.
6. `@gatherloop-pos/ui` exports no composition root; `@gatherloop-pos/ui/pos` and
   `@gatherloop-pos/ui/order` each export exactly one app's roots.
7. `nx show projects` lists `pos-web`, `pos-web-e2e`, `pos-mobile`, `pos-mobile-e2e`, `order-web`,
   `order-web-e2e`, `api`, `ui`, `provider`, `api-contract`.
8. `nx run-many --target=lint,test --all` and both Playwright suites are green on `main`.
9. The POS web deploy, the order Vercel deploy and the Storybook deploy have each succeeded once
   after their rename phase.
10. No behavioural diff: no PR in phases 1–5 changed a file outside an import statement, a barrel, a
    Storybook `title`, or a config that names a path.

---

## 11. Follow-ups, deliberately out of scope

### 11.1 Unify the CRUD usecase families (its own TRD)

`domain/usecases/` is 85 files, 13,712 LOC of source and 8,445 LOC of tests. Normalised clone
analysis — rename the entity throughout, then diff each file against a family reference — shows how
much of it is one machine typed out repeatedly:

| Family | n | Differing lines vs. reference |
| --- | ---: | --- |
| Delete | 15 | **8 files at 0**, 4 at 1, then 35 / 44 / 57 |
| Create | 17 | 0, 2, 2, 4, 6, 6, 12, 16, 17, 18 … then 49 → 106 |
| Update | 15 | 0, 4, 4, 11, 11, 23, 27 … then 43 → 87 |
| List | 21 | 0, 2, 11, 11, 11, 16, 30, 39 … then 136 → 248 |

Eight Delete usecases are byte-identical after renaming; `couponList`, `ticketList` and `tableList`
are 11 lines from `budgetList`, itself 2 lines from `walletList`. Roughly **37 of the 68 CRUD-family
files — about 4,700 LOC — are one state machine written 37 times.**

`ProductListUsecase` and `MenuListUsecase` share the same six states and 7 of 8 `getNextState`
branches; what differs is pagination, the URL-query repository, the sync cache short-circuit, and the
payload. So a generic machine would let the two apps share the *machine*, not the *usecase* — each
app keeps a thin config naming its repository and payload.

Kept separate because it is a different risk class: this refactor's safety property is "no PR changes
behaviour", verified mechanically; unification is the inverse — same paths, changed semantics, with
8,445 lines of tests as the spec. Its first phase should prototype the generic machine against three
usecases spanning the range — `couponList` (11), `categoryList` (39), `productList` (232) — to
settle whether it covers the tail or only the clone cluster.

One drift found while measuring: `categoryDelete` spreads `...state` on `HIDE_CONFIRMATION`,
`supplierDelete` does not. Behaviour is identical (both fields are set explicitly), but it is exactly
the drift duplication breeds.

### 11.2 Promote the folders to Nx libraries

If `nx affected` granularity or package-level boundary enforcement becomes worth the config cost
(D8), the promotion is `git mv` plus scaffolding — and by then the shared surface will be known from
experience rather than guessed.

### 11.3 Domain-subfolder `screens/pos/`

If the flat 220-file directory grates (D11), adding domain folders is a pure `git mv` inside
`screens/pos/` plus the matching title level.

---

## References

- `docs/trd-order-app-nextjs-migration.md` — D6 (`@gatherloop-pos/ui/order` exists and why), D20
- `docs/prd-table-ordering.md` — D14, D17, D20, D22 (the order app's composition roots)
- `docs/trd-form-ownership-refactor.md` — the phase-per-PR format this TRD follows, and the
  `controllers/**` lint override that must survive
- `docs/trd-storybook-vercel-deployment.md` — how Storybook ships
- `docs-site/under-the-hood/clean-architecture.md` — the layer contract this refactor preserves
