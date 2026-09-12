# TRD — Replace relative imports with path aliases across `libs/ui` and the frontend apps

**Status:** proposed — no code changed yet
**Scope:** `libs/ui/src`, `libs/ui/.storybook`, `libs/ui/jest.config.ts`, `libs/ui/.eslintrc.json`, `tsconfig.base.json`, `.eslintrc.json`, `apps/{order-web,order-web-e2e,pos-mobile,pos-mobile-e2e,pos-web,pos-web-e2e}`
**Non-scope:** `apps/api`, `libs/api-contract` internals, `libs/provider` internals, any runtime behaviour, any component or use-case API, any file move other than D5
**Date of research:** 2026-09-13 (all counts measured against `a87f700`)

---

## 1. Problem statement

`libs/ui` is a 1,029-file library organised into four layers, and every import between those
layers is spelled as a relative path. The deepest are five levels up:

```ts
// libs/ui/src/presentation/views/components/transactions/TransactionItemSelect.test.tsx
import { mockProduct, mockProducts } from '../../../../../.storybook/mocks/mockData';

// libs/ui/src/data/api/customer.ts
import { RequestConfig } from '../../../../api-contract/src/client';
```

Three concrete costs:

**1.1 The path does not say what it points at.** One directory, `libs/ui/src/domain`, is reached
386 times under four different spellings — `'../domain'` (1), `'../../domain'` (106),
`'../../../domain'` (131), `'../../../../domain'` (148). A reviewer reading a diff hunk cannot tell
whether `'../base'` means
`presentation/views/components/base` or something else without opening the file and counting
directory levels. Moving a single file — the thing this codebase does often, since a feature slice
spans `domain/`, `data/`, `presentation/` and `app/` — invalidates every relative specifier in it
and in nothing else, so the breakage is silent until `tsc` runs, and CI does not run `tsc`
(§7, R5).

**1.2 Relative paths cross project boundaries, and nothing stops them.** 49 imports inside
`libs/ui/src/data/api` reach into a *different Nx project* by walking up out of `libs/ui`:

```ts
import { productList } from '../../../../api-contract/src';
```

So does `apps/pos-web/tamagui.config.ts`, `apps/order-web/tamagui.config.ts`
(`'../../libs/ui/src/index'`), and `apps/pos-mobile/src/app/auth.native.spec.ts`
(`'../../../../libs/ui/src/data/api/auth.native'`). These bypass the published entry points
(`@gatherloop-pos/ui`, `/pos`, `/order`) that `docs/trd-ui-presentation-split-by-app.md` exists to
establish, and they defeat `@nx/enforce-module-boundaries`' dependency graph, which reasons about
package specifiers.

**1.3 One of these specifiers is load-bearing for the test suite, by accident.**
`libs/ui/jest.config.ts` stubs the whole generated API client with a regex over the *relative*
shape of the path:

```ts
'.*api-contract/src.*': '<rootDir>/src/__mocks__/api-contract.ts',
```

That mapping is what lets `npx nx run ui:test` pass in a fresh clone without running OpenAPI
codegen — `.github/workflows/pr-test.yml` says so in a comment. Any change to how `api-contract` is
imported that does not also change this regex turns the entire `ui` suite red, and the failure
mode (resolving a gitignored generated directory) is not obviously connected to the cause.

### Root cause

`tsconfig.base.json` publishes exactly three aliases, all of them *public entry points* of
`libs/ui`:

```json
"@gatherloop-pos/api-contract": ["libs/api-contract/src/index.ts"],
"@gatherloop-pos/provider":     ["libs/provider/src/index.ts"],
"@gatherloop-pos/ui":           ["libs/ui/src/index.ts"],
"@gatherloop-pos/ui/pos":       ["libs/ui/src/index.pos.ts"],
"@gatherloop-pos/ui/order":     ["libs/ui/src/index.order.ts"]
```

There is no alias that addresses a file *inside* `libs/ui/src`. A module inside the library cannot
import the public barrel — that would collapse the whole library into every module's dependency
graph and create cycles — so relative paths are currently the only thing available. The fix is to
add the missing alias, not to change any import target.

---

## 2. Goals and non-goals

**Goals**

- **G1** — Every import in `libs/ui/src` that resolves outside the importing file's own directory
  is spelled as an alias.
- **G2** — Every import that crosses a project boundary (`libs/ui` ↔ `libs/api-contract`, `apps/*` ↔
  `libs/*`) uses that project's published package specifier.
- **G3** — The module graph after the migration is byte-for-byte equivalent to the one before:
  each alias resolves to the same file the relative path did.
- **G4** — `npx nx run ui:test`, `ui:lint`, `pos-web:build`, `order-web:build`,
  `ui:build-storybook`, the Playwright suites and a `pos-mobile` Metro bundle all pass at the end
  of *every* phase, not just the last one.
- **G5** — Relative cross-directory imports cannot come back: a lint rule rejects them.
- **G6** — The public surface of `libs/ui` is not widened; apps still reach it only through
  `@gatherloop-pos/ui`, `/pos` and `/order`.

**Non-goals**

- **N1** — Converting same-directory `./Sibling` imports (1,211 of them). They are already
  unambiguous and survive file moves as a group.
- **N2** — Changing what any module imports. No barrel is collapsed, no export is added or moved,
  except the single fixture move in D5.
- **N3** — Restructuring `libs/ui`'s directory layout, renaming layers, or touching the
  `index.pos.ts` / `index.order.ts` split.
- **N4** — Aliasing inside `libs/api-contract` (mostly generated) or `libs/provider` (3 files).
- **N5** — Any change to `apps/api` or the Go side.
- **N6** — Adding a typecheck or build job to CI. Named as deferred in §9, not done here.

---

## 3. Current-state audit

### 3.1 Where the relative imports are

`libs/ui/src` holds 1,029 `.ts`/`.tsx` files and 2,876 relative import specifiers:

| Shape | Count | Disposition |
| --- | ---: | --- |
| `'./Sibling'` (same directory) | 1,211 | **kept** (N1) |
| `'./sub/path'` (descendant) | 17 | converted |
| `'../…'` | 341 | converted |
| `'../../…'` | 717 | converted |
| `'../../../…'` | 293 | converted |
| `'../../../../…'` | 231 | converted |
| `'../../../../../…'` | 65 | converted |
| **To convert in `libs/ui`** | **1,664** | across **730 files** |

By source directory — this is also the phase split in §6:

| Source directory | Files | Imports to convert |
| --- | ---: | ---: |
| `domain/repositories` | 28 | 28 |
| `domain/usecases` | 168 | 335 |
| `domain/entities` | 0 | 0 |
| `data` | 100 | 202 |
| `presentation/views/components` | 131 | 218 |
| `presentation/views/screens` | 97 | 212 |
| `presentation/handlers/pos` | 113 | 361 |
| `presentation/handlers/order` | 8 | 52 |
| `presentation/handlers/hooks` | 16 | 23 |
| `app/pos` | 56 | 170 |
| `app/order` | 5 | 42 |
| `utils` | 3 | 4 |

`domain/entities` has zero — entities depend on nothing, exactly as
`docs/trd-presentation-layer-architecture.md` claims. The audit confirms the architecture; it is
only the spelling that is wrong.

### 3.2 What they point at

The 1,664 specifiers resolve to a short list of targets. Normalising away the leading `../`s:

| Resolved target | Count |
| --- | ---: |
| `domain` (barrel) | 386 |
| `data/mock` | 140 |
| `domain/entities` (as `../entities`) | 98 |
| `domain/repositories` (as `../repositories`) | 86 |
| `utils/usecase` | 82 |
| `presentation/views/components/base` | 69 |
| `.storybook/mocks/mockData` | 63 |
| `presentation/views/components` | 62 |
| `utils/testUtils` | 58 |
| `presentation/handlers/hooks` | 58 |
| `data` (barrel) | 57 |
| `presentation` | 56 |
| `api-contract/src` + `/src/client` | 46 + 3 |
| everything else | ~400 |

Two observations that drive the design:

- The overwhelming majority already point at a **barrel**, not a deep file. Aliasing is a
  find-and-replace on the prefix; it does not change which module is loaded.
- 63 imports — including non-Storybook files like
  `presentation/views/components/transactions/TransactionItemSelect.test.tsx` — reach into
  `libs/ui/.storybook/mocks/mockData.ts`, which is *outside* `src`. Unit tests depend on a
  Storybook configuration directory. This needs its own decision (D5).

### 3.3 The apps

The apps are nearly clean already — 33 relative specifiers in total:

| Project | Relative imports | Notes |
| --- | ---: | --- |
| `apps/pos-web` | 2 | 1 in-app (`../../tamagui.config`), 1 **cross-project** (`'../../libs/ui/src/index'`) |
| `apps/order-web` | 2 | same shape as `pos-web` |
| `apps/pos-mobile` | 4 | 2 in-app (`'./app/App'`), 2 **cross-project** into `libs/ui/src/data/api`, plus a `jest.mock('../../../../libs/api-contract/src/client')` call |
| `apps/pos-web-e2e` | 17 | all `'./utils/api'`, `'./utils/selectors'` |
| `apps/order-web-e2e` | 8 | all `'./utils/*'` |
| `apps/pos-mobile-e2e` | 0 | nothing to do |

The four cross-project ones in §1.2 are the high-value items here; the 25 e2e ones are descendant
paths inside a single spec directory and are worth converting only for consistency.

### 3.4 What the resolvers currently prove — and what they don't

`libs/ui/src` contains **zero** `@gatherloop-pos/*` imports today. Every alias in this repo is
resolved either by Next (`apps/pos-web`, `apps/order-web`), by Metro (`apps/pos-mobile`), or by the
one line in `libs/provider/src/provider.tsx`. **No test in `libs/ui` has ever resolved a
`tsconfig.base.json` path alias**, because none exists there to resolve.

Six resolvers must therefore be proven, not assumed:

| Resolver | Configured by | Currently proven for aliases? |
| --- | --- | --- |
| `tsc` | `libs/ui/tsconfig.lib.json` → `tsconfig.base.json` | yes (paths are inherited) |
| Jest (`ui`) | `libs/ui/jest.config.ts` + `@nx/jest/preset` | **no** |
| Jest (`pos-mobile`) | `apps/pos-mobile/jest.config.ts`, `resolver: '@nx/jest/plugins/resolver'` | partly |
| Next/webpack | `apps/{pos,order}-web/next.config.js` via `withNx` | yes |
| Metro | `apps/pos-mobile/metro.config.js` via `withNxMetro`, `watchFolders: []` | yes |
| Storybook webpack | `libs/ui/.storybook/main.ts` | **no** |
| Playwright | `apps/*-e2e/tsconfig.json` | **no** |

This is the single largest unknown in the migration and is why Phase 1 exists.

### 3.5 What the lint rules currently assume

`libs/ui/.eslintrc.json` is, per `CLAUDE.md`, the authority on layer boundaries. Four of its
`no-restricted-imports` pattern groups encode the *relative* shape of an import:

```json
{ "group": ["**/app/order/**", "**/screens/order/**", "**/handlers/order/**", "../order/**"] }
{ "group": ["**/app/pos/**",   "**/screens/pos/**",   "**/handlers/pos/**",   "../pos/**"] }
```

The `**/…` halves keep matching an aliased specifier (minimatch runs against the literal source
string, and `@ui/presentation/handlers/pos/X` still contains a `handlers/pos` segment). The
`"../pos/**"` / `"../order/**"` halves become dead the moment the POS ↔ order sibling imports they
guard are aliased. Nothing warns about a `no-restricted-imports` pattern that can no longer match.

Separately, `.eslintrc.json` (root) runs `@nx/enforce-module-boundaries` with `"allow": []`. That
rule reports *self-imports through an alias* — "Projects should use relative imports to import from
files in the same project" — which is precisely what this migration introduces, 1,664 times. See
D7.

---

## 4. Target architecture

Two namespaces, with different jobs:

```
Public entry points — used by apps/*, libs/provider, and nothing inside libs/ui
  @gatherloop-pos/ui          → libs/ui/src/index.ts
  @gatherloop-pos/ui/pos      → libs/ui/src/index.pos.ts
  @gatherloop-pos/ui/order    → libs/ui/src/index.order.ts
  @gatherloop-pos/api-contract        → libs/api-contract/src/index.ts
  @gatherloop-pos/api-contract/client → libs/api-contract/src/client.ts   (new)
  @gatherloop-pos/provider    → libs/provider/src/index.ts

Internal deep paths — used only inside libs/ui, never by apps/*
  @ui/*                       → libs/ui/src/*
```

After the migration a file in `libs/ui` reads:

```ts
// libs/ui/src/presentation/handlers/pos/AuthLoginHandler.test.tsx
import { AuthLoginHandler } from './AuthLoginHandler';          // unchanged (N1)
import { MockAuthRepository } from '@ui/data/mock';             // was '../../../data/mock'
import { AuthLoginUsecase } from '@ui/domain';                  // was '../../../domain'
import { flushPromises } from '@ui/utils/testUtils';            // was '../../../utils/testUtils'
```

and a file in `libs/ui/src/data/api`:

```ts
import { productList } from '@gatherloop-pos/api-contract';        // was '../../../../api-contract/src'
import { RequestConfig } from '@gatherloop-pos/api-contract/client'; // was '.../src/client'
```

and `apps/pos-web/tamagui.config.ts`:

```ts
import { tamaguiConfig } from '@gatherloop-pos/ui';             // was '../../libs/ui/src/index'
```

The rule a contributor has to remember is one sentence: **same directory → `./`, anywhere else
inside `libs/ui` → `@ui/`, another project → `@gatherloop-pos/`.**

---

## 5. Design decisions

### D1 — Internal deep imports get their own namespace, `@ui/*`, not a widened `@gatherloop-pos/ui/*`

`@ui/*` → `libs/ui/src/*` is added to `tsconfig.base.json`. The three `@gatherloop-pos/ui*` keys are
untouched.

Three reasons:

1. **No key collision under non-TypeScript resolvers.** Widening to `"@gatherloop-pos/ui/*":
   ["libs/ui/src/*"]` puts a wildcard key next to two exact keys, `@gatherloop-pos/ui/pos` and
   `@gatherloop-pos/ui/order`. TypeScript's own rule — exact match beats pattern match — makes that
   safe for `tsc`. Metro, Jest's `@nx/jest` resolver and Storybook's webpack config each re-implement
   `paths` lookup, and their precedence between an exact key and an overlapping wildcard is not
   something this repo has ever exercised. `@ui/*` overlaps nothing.
2. **G6.** A wildcard on the public package name makes
   `import { TransactionListHandler } from '@gatherloop-pos/ui/presentation/handlers/pos/…'` legal
   from `apps/order-web`, which is exactly the thing
   `docs/trd-ui-presentation-split-by-app.md` §1.1 built the two barrels to prevent. Today an app
   physically cannot deep-import without an `'../../libs/…'` path that `@nx/enforce-module-boundaries`
   rejects; widening the alias would quietly remove that floor. Keeping `@ui/*` internal means the
   guard is one lint rule (D8) instead of a convention.
3. **A reviewer can see the difference.** `@gatherloop-pos/…` in a diff means "another project";
   `@ui/…` means "elsewhere in this library". Under one namespace the two are indistinguishable at a
   glance.

The user-facing example in the original request — `@gatherloop-pos/ui` — is still exactly what
`apps/*` use; this decision only concerns the ~1,664 imports that never leave `libs/ui`.

**Alternative rejected:** `"@gatherloop-pos/ui/*": ["libs/ui/src/*"]`. Fewer concepts, matches the
request literally, and reads better in isolation. Rejected on reason 2: it trades a structural
guarantee for a lint rule, and this repo's stated position (`CLAUDE.md`, "Layer boundaries are
enforced by ESLint, not by convention") is that a guarantee is worth more. If the reviewer disagrees,
flipping is cheap — one `tsconfig.base.json` key and one constant in the codemod — but it must be
decided in Phase 1, before 730 files are rewritten. Listed as **OQ1**.

### D2 — Aliases are path-equivalent. No import is ever redirected to a barrel

`'../../domain/entities/Product'` becomes `'@ui/domain/entities/Product'`, **not**
`'@gatherloop-pos/ui'` or `'@ui/domain'`. The codemod resolves the relative specifier to an absolute
path and re-spells that same path.

This is what makes G3 true and makes every phase independently revertible. Collapsing deep imports
into barrels would be a different change with a different risk profile: it creates import cycles
(`domain/usecases/X` → `domain/index.ts` → `domain/usecases/X`), it changes what Next's per-page
bundler pulls into a route, and it would undo the bundle-size property `index.order.ts` is written
to preserve. A "while we're here, let's use the barrel everywhere" suggestion in review should be
answered with this decision number.

**Alternative rejected:** normalising to the nearest barrel for readability. Rejected: it changes
the module graph, which is out of scope by N2 and unverifiable by the acceptance checks in §6.

### D3 — Same-directory imports stay relative; everything else is aliased

An import stays `./X` if and only if it resolves to a file in the importer's own directory. The
1,211 same-directory specifiers are untouched. The 17 descendant `./sub/path` specifiers are
converted, because they break the same way a `../` one does when the importer moves.

`index.ts` barrels are the systematic exception and stay relative in full: `export * from './base'`
inside `presentation/views/components/index.ts` is a barrel re-exporting its own subtree, and
rewriting it to `@ui/presentation/views/components/base` would make a file import itself through an
alias for no gain.

**Alternative rejected:** alias everything, including siblings. It doubles the diff to ~2,876
specifiers and 1,029 files, makes the barrels self-referential, and buys nothing: `./X` already
names one unambiguous file and survives a directory move.

### D4 — Cross-project relative imports are eliminated in their own phase, together with the Jest mapper

The 49 `api-contract` specifiers, the two `tamagui.config.ts` files and the two
`apps/pos-mobile/src/app/auth.native.spec.ts` imports (plus its `jest.mock('…/libs/api-contract/src/client')`
call) all move in one PR, because they share a failure mode: `libs/ui/jest.config.ts`'s
`'.*api-contract/src.*'` mapper stops matching the moment the `/src` segment leaves the specifier,
and the `ui` suite then tries to resolve `libs/api-contract/src/__generated__`, which is gitignored.
The mapper becomes:

```ts
'^@gatherloop-pos/api-contract(/.*)?$': '<rootDir>/src/__mocks__/api-contract.ts',
```

Three of the 49 import `api-contract/src/client`, which `libs/api-contract/src/index.ts` does not
re-export. Rather than add `export * from './client'` to that barrel — which would put
`axiosInstance`, `axiosClient` and a default export into the surface of every `api-contract`
consumer and risks a name collision with generated symbols — a second alias key,
`@gatherloop-pos/api-contract/client`, is added. It is an exact (non-wildcard) key, so it carries
none of the precedence risk D1 avoids.

`apps/pos-mobile`'s `jest.mock()` call takes a module path, not an import; the alias in it is
resolved by `@nx/jest/plugins/resolver`, which that project already configures. Phase 2's acceptance
check must actually run that spec, not just typecheck it.

**Alternative rejected:** folding these into the per-directory phases (the 46 `api-contract` imports
all live under `data/api`, so they would fall into Phase 5). Rejected: the Jest-mapper coupling makes
this the one change in the migration that can turn 100% of the `ui` suite red, and it deserves a PR
a reviewer can read in one screen.

### D5 — `.storybook/mocks/mockData.ts` moves to `libs/ui/src/__fixtures__/mockData.ts`

63 files import it, and they are not all stories — `TransactionItemSelect.test.tsx` and its
neighbours are plain Jest tests. A unit test reaching five levels up into a Storybook *configuration*
directory is backwards regardless of how the path is spelled, and `@ui/*` cannot address anything
outside `src`.

Moving the file into `src/__fixtures__/` makes the alias fall out for free
(`@ui/__fixtures__/mockData`) and puts shared test data where both consumers can legitimately see it.
Consequence to handle in the same PR: `libs/ui/tsconfig.lib.json` includes `src/**/*.ts`, so the
fixture would be typechecked as library code — that is acceptable (it is plain data, it imports only
entity types), but the file must not be re-exported from any `index.ts`, or 550 lines of mock data
enter the app bundles.

**Alternative rejected:** a second alias, `@ui-storybook/*` → `libs/ui/.storybook/*`. Zero file
moves, but it blesses the inversion — it makes "unit tests import from the Storybook config" a
supported, named path — and adds a third namespace for one file.

### D6 — The codemod is a committed script, run per phase, deleted at the end

`tools/codemod-relative-to-alias.mjs` is added in Phase 1 and removed in the last phase. Per phase
it is invoked on one directory:

```bash
node tools/codemod-relative-to-alias.mjs libs/ui/src/domain
```

It parses each file's import/export specifiers, resolves any starting with `.` against the file's
directory, and rewrites the ones that land outside that directory (D3) and inside a known alias root.
It resolves through `index.ts` the way the module resolver does, so `'../../domain'` maps to
`@ui/domain`, not `@ui/domain/index`.

Committing it rather than running it ad-hoc means: a reviewer can re-run it on the phase's directory
and diff the result against the PR (the check in §6), and a merge conflict during a long-running
phase is resolved by re-running it on `main` rather than hand-editing hundreds of lines (R4).

**Alternative rejected:** relying solely on `eslint-plugin-no-relative-import-paths --fix`. Its
autofix does the same job, and it is being adopted anyway (D8) — but it applies one `rootDir`/`prefix`
pair per ESLint config block, it does not resolve barrel `index.ts` targets, and it gives no way to
scope a run to one directory for a phase. It is the right *guard* and the wrong *migration tool*.

### D7 — `@nx/enforce-module-boundaries` must allow the internal alias

`@ui/*` resolves, through `tsconfig.base.json`, to files in the `ui` project. Every converted import
is therefore a project importing itself through an alias, which the rule reports as
*"Projects should use relative imports to import from files in the same project."* With 1,664 of
them, `npm run lint` — and husky's `pre-commit`, which runs it — fails outright.

Root `.eslintrc.json` changes to:

```json
"@nx/enforce-module-boundaries": ["error", {
  "enforceBuildableLibDependency": true,
  "allow": ["@ui/*"],
  "depConstraints": [{ "sourceTag": "*", "onlyDependOnLibsWithTags": ["*"] }]
}]
```

The `allow` list exempts matching specifiers from the rule's checks entirely. This is the one change
in the migration that weakens an existing guard, and it is narrow: it exempts a namespace that D8
forbids outside `libs/ui` anyway. **Phase 1's first job is to confirm this exact behaviour on Nx
20.8.1 against ten converted files** — if `allow` does not suppress the self-import report, the whole
approach needs rethinking before 730 files are touched, and OQ1 (flipping to `@gatherloop-pos/ui/*`)
does not help, since that variant trips the same rule.

**Alternative rejected:** an alias that Nx cannot resolve to a project (e.g. a Jest
`moduleNameMapper` and a webpack alias, with no `tsconfig.base.json` entry). It dodges the rule by
blinding Nx's dependency graph — breaking `nx affected`, which `CLAUDE.md` documents as the narrow
test command. Strictly worse.

### D8 — Enforcement lands last, as one PR, and fixes the lint rules the migration invalidates

The final phase adds `eslint-plugin-no-relative-import-paths` (new devDependency) to
`libs/ui/.eslintrc.json`:

```json
"no-relative-import-paths/no-relative-import-paths": [
  "error", { "allowSameFolder": true, "rootDir": "libs/ui/src", "prefix": "@ui" }
]
```

and, in the same PR, three corrections that the migration itself makes necessary:

1. **Ban the internal namespace outside its library.** A `no-restricted-imports` pattern on
   `apps/*/.eslintrc.json` and `libs/provider/.eslintrc.json` rejecting `@ui/*`, with a message
   pointing at `docs/trd-ui-presentation-split-by-app.md`. Without this, D1's reason 2 is a
   convention again.
2. **Ban self-barrel imports inside `libs/ui`.** A pattern on `libs/ui/.eslintrc.json` rejecting
   `@gatherloop-pos/ui`, `@gatherloop-pos/ui/pos` and `@gatherloop-pos/ui/order`. This is the
   cycle-and-bundle failure D2 exists to prevent, and after the migration it is an easy mistake to
   make — the alias is now *right there*.
3. **Retire the dead relative patterns.** `"../pos/**"` and `"../order/**"` in the two cross-app
   groups (§3.5) can no longer match anything. Their alias equivalents (`@ui/app/pos/**`,
   `@ui/presentation/handlers/pos/**`, and the order mirrors) are added in **Phase 1**, not here —
   additive and harmless while both spellings coexist — so the POS ↔ order guard is never weaker
   than it is today at any point in the migration. Phase 12 only deletes the dead halves.

**Alternative rejected:** `no-restricted-imports` with `"patterns": ["../*", "../../*"]` and no new
dependency. It catches the same thing, but it has no autofix and no `allowSameFolder` notion, so
every future violation is hand-fixed and the `./sub/path` case (D3) escapes it.

### D9 — Each phase is verified locally against six targets, because CI verifies none of them

`.github/workflows/pr-test.yml` runs exactly two things on a PR: `npx nx run ui:test` and
`npx nx run api:test`. It does **not** run lint, typecheck, or any build. A phase that breaks the
Next build, the Storybook build, the Metro bundle, or ESLint merges green.

Every phase PR therefore states, in its description, the output of:

```bash
npx tsc -p libs/ui/tsconfig.lib.json --noEmit     # G3, per phase
npx nx run ui:lint                                 # D7/D8 regressions
npx nx run ui:test                                 # the Jest resolver
npx nx run pos-web:build                           # Next + Tamagui extraction
npx nx run order-web:build
npx nx run ui:build-storybook                      # Storybook webpack resolver
```

plus, in Phase 1 and the final phase only (they are the slow ones), a `pos-mobile` Metro bundle and
`npm run react-compiler:healthcheck`. The e2e suites run in the phases that touch them and in the
final phase.

**Alternative rejected:** adding these to CI as part of this work. Right idea, wrong PR — it changes
what blocks every unrelated contributor and should be argued on its own. Deferred (§9).

### D10 — Phases are per-directory, leaf-first, and independent after Phase 2

Because of D2 the module graph never changes, so a phase touching only `domain/` cannot break a file
in `presentation/`. Phases 3–10 are therefore independent and reorderable; only Phases 1 and 2 are
prerequisites, and only Phase 12 must come last. This matters for R4: a phase that sits in review
for three days can be rebuilt by re-running the codemod instead of resolving conflicts by hand.

---

## 6. Phased delivery

Each phase is one PR. Each leaves `main` green and the product shippable. "Imports" is the count of
specifiers rewritten from §3.1.

| # | PR | Files | Imports | Acceptance |
|---|---|---|---|---|
| **0** | This TRD | `docs/trd-import-alias-migration.md` | — | Reviewer agrees with D1 (OQ1), D5 and the phase split before any code moves |
| **1** | Enabling change + resolver spike | `tsconfig.base.json`, `.eslintrc.json`, `libs/ui/.eslintrc.json`, `tools/codemod-relative-to-alias.mjs`, `libs/ui/src/utils` (3 files) | 4 | All six resolvers in §3.4 green on the 4 converted imports, **including** a `pos-mobile` Metro bundle and a Storybook build; `npx nx run ui:lint` clean, proving D7's `allow` works; alias-form patterns added alongside the relative ones per D8.3 |
| **2** | Cross-project imports + Jest mapper | `libs/ui/src/data/api/*` (49), `apps/{pos,order}-web/tamagui.config.ts`, `apps/pos-mobile/src/app/auth.native.spec.ts`, `libs/ui/jest.config.ts` | 53 | `npx nx run ui:test` green **in a clone with no codegen run** (proves the new mapper regex); the `pos-mobile` spec actually executes, not just compiles; `@gatherloop-pos/api-contract/client` key added |
| **3** | `domain/repositories` | 28 files | 28 | D9 checklist; `git grep -n "from '\.\./" libs/ui/src/domain/repositories` empty |
| **4** | `domain/usecases` | 168 files | 335 | D9 checklist; the `UsecaseTester` suites pass unchanged |
| **5** | `data/` | 100 files | 202 | D9 checklist; `data/mock` still reachable from the 140 call sites |
| **6** | `presentation/views/components` | 131 files | 218 | D9 checklist + `ui:build-storybook`, since this is where the stories live |
| **7** | `presentation/views/screens` | 97 files | 212 | D9 checklist; the screens-layer `no-restricted-imports` group still fires on a deliberately-added `@ui/domain/usecases/…` import (verify the guard survived) |
| **8** | `presentation/handlers/pos` | 113 files | 361 | D9 checklist; largest phase — split by feature folder if review asks |
| **9** | `presentation/handlers/order` + `handlers/hooks` | 24 files | 75 | D9 checklist; the POS-only / order-only hook bans still fire |
| **10** | `app/pos` + `app/order` | 61 files | 212 | D9 checklist; `app/order`'s `react` ban and the cross-app bans still fire; `order-web:build` bundle size unchanged (D2's whole point) |
| **11** | Fixture move | `libs/ui/.storybook/mocks/mockData.ts` → `libs/ui/src/__fixtures__/mockData.ts`, 63 importers | 63 | `ui:test` and `ui:build-storybook` both green; `mockData` exported from no `index.ts`; `pos-web:build` output size unchanged |
| **12** | e2e projects | `apps/pos-web-e2e` (17), `apps/order-web-e2e` (8), `apps/pos-mobile/src/main*.tsx` | 27 | Both Playwright suites run locally against a built app — Playwright's `paths` support is unproven here (§3.4) and this is the phase that proves it |
| **13** | Enforcement + cleanup | `package.json`, `libs/ui/.eslintrc.json`, `apps/*/.eslintrc.json`, `libs/provider/.eslintrc.json`, `CLAUDE.md`, delete `tools/codemod-relative-to-alias.mjs` | — | Full D9 checklist including Metro and the e2e suites; a deliberately-added `'../../domain'` import fails `ui:lint`; a deliberately-added `@ui/*` import in `apps/pos-web` fails `pos-web:lint`; `CLAUDE.md` states the one-sentence rule from §4 |

Phases 3–11 are independent of each other (D10) and may be reordered, parallelised across
contributors, or cut short. If the list has to stop early, stopping after **2** already removes every
cross-project relative import — the only ones that are a correctness problem rather than a
readability one.

### Review order within each conversion PR

Ask the reviewer to check, in this order: (1) re-run
`node tools/codemod-relative-to-alias.mjs <dir>` on `main` and confirm the diff matches the PR
exactly — if it does, the change needs no line-by-line reading; (2) confirm no specifier changed
*target*, only spelling (D2); (3) confirm the D9 output is in the description.

---

## 7. Risks

- **R1 — A resolver silently disagrees.** Jest (`ui`), Storybook webpack and Playwright have never
  resolved a `tsconfig.base.json` alias in this repo (§3.4). The likely failure is a hard
  "cannot find module", which is loud; the unlikely-but-worse one is Metro resolving `@ui/data` to a
  different file than `tsc` does. *Mitigation:* Phase 1 converts four imports and runs all six
  resolvers before anything else moves. Phase 1 is cheap to revert.
- **R2 — `@nx/enforce-module-boundaries` rejects every converted import.** D7. *Mitigation:*
  Phase 1's `ui:lint` run is the gate; if `allow` does not work, the migration stops at Phase 1 with
  4 files changed.
- **R3 — The `ui` Jest suite goes fully red in Phase 2.** The `.*api-contract/src.*` mapper is what
  makes the suite runnable without codegen (§1.3). *Mitigation:* D4 changes the mapper in the same
  PR, and the acceptance check is explicitly "green in a clone with no codegen run", which is the
  condition CI runs under.
- **R4 — Merge conflicts against concurrent feature work.** 730 files across nine conversion PRs,
  and this repo ships features continuously. *Mitigation:* D10 (phases are independent), D6 (the
  codemod is committed, so a conflicted phase is regenerated in seconds rather than merged by hand),
  and a request that conversion PRs be reviewed and merged within a day.
- **R5 — CI cannot catch a broken build.** `pr-test.yml` runs no lint, no typecheck and no build
  (§3.4, D9). A phase that breaks `pos-web:build` or the Metro bundle merges green and is discovered
  at deploy time. *Mitigation:* the D9 checklist in every PR description, and §9's deferred CI job.
- **R6 — A lint guard is silently retired.** The `"../pos/**"` patterns stop matching the moment
  Phases 8–10 land, and nothing reports a `no-restricted-imports` pattern that can no longer match
  (§3.5). *Mitigation:* D8.3 adds the alias-form patterns in **Phase 1**, ahead of the conversions,
  so the guard is never weaker than today; Phases 7, 9 and 10 each verify a boundary still fires by
  adding a violating import on purpose.
- **R7 — Tamagui's compile-time extraction follows a different resolver.** `withTamagui` statically
  traverses imports to extract styles, and `disableExtraction` is on in development — so a
  resolution failure would appear only in a production build. *Mitigation:* `pos-web:build` and
  `order-web:build` are in the D9 checklist for every phase, and they run extraction.
- **R8 — The Metro path is the least protected.** `apps/pos-mobile` has no build in CI, no
  Playwright suite worth the name (`pos-mobile-e2e` has zero relative imports and little else), and
  `metro.config.js` sets `watchFolders: []`. *Mitigation:* a Metro bundle in Phase 1 and Phase 13;
  Phase 2 additionally runs the one `pos-mobile` Jest spec that reaches into `libs/ui`.

---

## 8. Rollback

Per phase: `git revert` the phase's single commit. Because of D2 no phase changes behaviour, no
phase depends on a later one, and Phases 3–11 do not depend on each other, so any one can be reverted
in isolation without touching the others.

The enabling change (Phase 1) is the only one with a fan-out: reverting it strands every later
phase's `@ui/*` specifier. If Phase 1 has to come out after later phases have merged, revert in
reverse order, or — cheaper — keep the `tsconfig.base.json` key and the `allow` entry and revert only
the parts that failed. Nothing in Phase 1 changes runtime behaviour, so leaving the alias registered
but unused is a safe resting state.

The fixture move (Phase 11) is the only phase that moves a file; revert it with `git revert` rather
than by moving the file back, so the 63 importers move with it.

---

## 9. Deferred

- **A CI typecheck and build job.** The real hole is §3.4 / R5: `pr-test.yml` proves neither that
  the workspace compiles nor that any app builds. Adding `npx nx affected -t lint build` would catch
  every failure mode this migration risks — and every failure mode unrelated feature work risks too.
  It is deferred because it changes what blocks every contributor and deserves its own argument, not
  because it is unimportant. It is the highest-value follow-up in this document.
- **Same-directory imports (N1).** 1,211 specifiers. Revisit only if a future directory
  restructuring makes them churn.
- **`libs/api-contract` and `libs/provider` internals (N4).** 3 hand-written files between them;
  the rest is generated. Not worth a PR.
- **`@ui/*`-style internal aliases for the apps.** `apps/pos-web/src` has one in-app relative import
  (`'../../tamagui.config'`) and `apps/pos-mobile` two (`'./app/App'`). An `@pos-web/*` namespace per
  app would be three aliases to buy three conversions. Phase 12 converts the e2e `./utils/*` paths
  because 25 specifiers across two projects clears the bar; the app sources do not.
- **Collapsing deep imports into barrels.** Explicitly rejected by D2 for this migration; if anyone
  wants it, it is a separate TRD with a bundle-size section.

---

## 10. Open questions

- **OQ1 — `@ui/*` or `@gatherloop-pos/ui/*`?** D1 argues for `@ui/*`. The counter-argument (one
  namespace, matches the original request's example) is real. This must be settled in Phase 1
  review: after Phase 3 it is a 730-file rewrite to change, before Phase 3 it is one tsconfig key and
  one constant in the codemod.
- **OQ2 — Does `mockData.ts` belong in `src/__fixtures__` or in a `libs/ui-testing` project?** D5
  takes the cheap option. A separate project would keep 550 lines of mock data out of
  `tsconfig.lib.json`'s include entirely, at the cost of a new Nx project for one file. Decide in
  Phase 11 review.
- **OQ3 — Is Phase 8 (113 files, 361 imports) one PR or four?** It is mechanical and codemod-
  verifiable (§6, review order), so one PR should be reviewable — but it is 3× the next largest
  phase. Split by feature folder if the reviewer prefers.

---

## 11. Settled in review

*(Nothing yet — this document has not been reviewed.)*
