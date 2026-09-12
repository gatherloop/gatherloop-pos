# Plan: A CLAUDE.md for this repo, and Skills for its recurring workflows

> **Scope of this document.** It is a plan, not an implementation. It specifies (a) what the
> repo's `CLAUDE.md` files should contain and why, (b) which recurring development workflows
> earn a Skill, with a complete spec for each, and (c) a phase breakdown where every phase is
> one small, reviewable PR. No application code is changed by this plan or by any phase in it —
> every phase touches only `CLAUDE.md`, `.claude/**`, and this file.

---

## 1. Problem statement

An AI agent dropped into this repo has to rediscover, every session, a set of conventions that
are unusually strict and unusually non-obvious:

- The frontend use case is a **hand-rolled finite state machine** (`getInitialState` /
  `getNextState` / `onStateChange`), not a hook, not Redux, not TanStack-Query-in-a-component.
  An agent that writes `useState` + `useEffect` in a handler produces code that passes `tsc`
  and fails review outright.
- `useForm` ownership is inverted from the React norm: the **innermost** component owns it, and
  handlers are forbidden from importing it (enforced by `no-restricted-imports`, with a fixed
  four-call-site escape hatch).
- `libs/api-contract/src/__generated__` is **gitignored** and `go.work` declares the generated
  Go module as a workspace member. On a fresh clone, *no Go file compiles* until
  `nx run api-contract:generate:go` has run. An agent reading a red `apps/api` will chase a
  phantom bug.
- Four root-level planning documents (`plan.md`, `TESTING_REVIEW.md`, `E2E_TEST_PLAN.md`,
  `HANDLER_INTEGRATION_TESTS_PLAN.md`) describe a `presentation/controllers/` layer that
  **no longer exists**. `docs/handlers.md` explicitly retires the word. An agent that greps for
  guidance and finds these will reintroduce a deleted layer.

The current `CLAUDE.md` is 7 lines and carries exactly one rule (no explanatory comments). The
`README.md` is genuinely good — but it is written for a human onboarding, so it explains *what
the system is* rather than *what an agent must not do*.

Separately, the repo's day-to-day work is extremely **templated**. The evidence:

| Shape | Count |
|---|---|
| Frontend use cases (`domain/usecases/*.ts`) | 87, of which 82 have a `.test.ts` |
| POS handlers | 58, of which 55 have a `.test.tsx` |
| POS screens | 58, of which 49 have a `.stories.tsx` |
| Go features (`domain/<x>_{entity,repository,usecase}.go`) | ~25, 24 with `_usecase_test.go` |
| Go REST features (`handler` + `route` + `transformer`) | ~25, 25 with `_handler_test.go` |
| SQL migrations (`golang-migrate` up/down pairs) | 25 pairs |
| PRD/TRD documents in `docs/` | ~30, in a consistent house style |
| VitePress feature pages in `docs-site/` | ~20 |

Every row in that table is a workflow an agent performs by copying an existing sibling and
editing it — which is exactly the shape a Skill serves best, and exactly the shape where an
agent working from first principles goes wrong.

## 2. Goals and non-goals

### Goals

- **G1** — An agent starting cold can make a correct, review-passing change to either side of
  the stack without reading 5,000 lines of TRD first.
- **G2** — The rules that lint *cannot* express are written down once, in the place the agent
  will actually load.
- **G3** — The repeated file-template workflows become Skills, so the agent produces the
  sibling-consistent set of files (including the test and the barrel export) instead of 80% of it.
- **G4** — Every phase is independently mergeable and reviewable in under ~15 minutes.

### Non-goals

- **N1** — Not changing any application code, lint config, workflow, or `package.json`. Where
  this plan finds a real defect (§7), it records it and stops.
- **N2** — Not replacing `README.md` or the `docs/` corpus. `CLAUDE.md` points at them; it does
  not restate them. Duplicated prose rots in two places at once.
- **N3** — Not documenting feature behaviour. That is what `docs/prd-*.md` and `docs-site/` are
  for, and they are already good.
- **N4** — Not adding an agent rule that ESLint already enforces, except where the rule needs
  context the error message cannot carry.

## 3. Current-state audit

### 3.1 What already carries convention well

These are load-bearing and should be **linked, never restated**:

| Source | Carries |
|---|---|
| `README.md` | Project structure, run/test/codegen commands, both Clean Architecture diagrams, React Compiler rule |
| `docs/handlers.md` | The handler shape; the promotion rule (1 call site → inline, ≥2 → `handlers/hooks/`); controllers are dead |
| `docs/forms.md` | `useForm` ownership rule, the `FormView` contract, the `formRef` escape hatch and its four sanctioned call sites |
| `libs/ui/.eslintrc.json` | Per-folder import bans with *explanatory messages* — the single best machine-readable statement of the layer rules |
| `docs/trd-presentation-layer-architecture.md` | The full audit behind the handler/view split, `D1`–`D9` |
| `docs/trd-react-compiler-adoption.md` | Why no hand-written `useMemo`/`useCallback`, and the one `useFocusEffect` exception |
| `docs/trd-order-app-composition-and-ssr.md` | Why `libs/ui` may not import `next` outside `utils/` |
| `.github/workflows/*.yml` | Heavily commented; the e2e workflow in particular documents traps found the hard way |

### 3.2 What is written down nowhere

Everything below is real, enforced in review or by a tool, and absent from any document an
agent is likely to load:

1. **Go does not compile on a fresh clone.** `go.work` has `use ./libs/api-contract/src/__generated__/go`; that path is gitignored. Run `npx nx run api-contract:generate:ts` / `:generate:go` before touching Go or reading type errors. The Go generator is a **Java** program (`openapi-generator-cli`) and needs a JDK.
2. **The four stale root docs** (§1). They predate the controller removal and the handler/view split.
3. **`npm test` and `npm run lint` run the entire workspace**, and husky's `pre-commit` runs *both*. The fast loop is `npx nx run ui:test` / `npx nx run api:test`, or `nx affected`. CI itself only runs the two path-filtered suites.
4. **The `libs/ui` Jest config stubs `api-contract` entirely** (`'.*api-contract/src.*'` → `src/__mocks__/api-contract.ts`), plus `tamagui`, `solito`, `react-native`, `next/router`. So a UI test never needs codegen — and a new generated symbol used in `data/api/` may need a line in that stub.
5. **`UsecaseTester` + `flushPromises`** (`libs/ui/src/utils/usecase.ts`) is the use-case test harness, and `MockXRepository.setShouldFail(true)` is how the error branch is driven. Handler tests use `@testing-library/react` with real use cases over mock repositories — **never** a mocked use case.
6. **Barrel discipline.** 48 `index.ts` files. A new entity/use case/repository/handler/screen/component/app-root is invisible until exported from its barrel, and the three public entry points are distinct: `@gatherloop-pos/ui` (shared domain/data), `@gatherloop-pos/ui/pos`, `@gatherloop-pos/ui/order` (`libs/ui/src/index.pos.ts` / `index.order.ts`).
7. **`apps/api/Makefile` defaults `MIGRATIONS_DIR` to `migrations`**, but the migrations live in `apps/api/data/mysql/migrations`, and `.env.example` does not set the variable. `make migrate-up` from `apps/api` fails until `MIGRATIONS_DIR` is set. CI sidesteps it with an explicit `-path`.
8. **Migrations are embedded (`embed.FS`) but never run at boot.** Nothing in `main.go` migrates; the `golang-migrate` CLI is the only path.
9. **The Go domain error type is `*domain.Error`**, not `error`, and it maps to an API code via `ToErrorCode(err.Type)` in the handler. A new use case method returning plain `error` breaks the handler template.
10. **`//go:generate mockgen`** lives on each `*_repository.go`; `data/mock/` is generated, not hand-written.
11. **Conventional commits are enforced** by commitlint + husky `commit-msg`.
12. **The composition root is a plain function, not a component.** `src/app/order/**` bans importing `react` outright — a root news up repositories and use cases and returns one Handler. POS roots follow the same shape by convention.
13. **Pages are thin.** A `pos-web` page is `getServerSideProps` (auth cookie check + repository prefetch) plus `export default <CompositionRoot>`. No JSX of its own.

### 3.3 Where an agent's mistakes actually land

Mapping the above to the failure it causes, which is what the `CLAUDE.md` sections should be
ordered by:

| Mistake | Caught by | Cost |
|---|---|---|
| `useState` in a handler instead of a use case FSM | review only | full rewrite |
| `useForm` in a handler | ESLint | fast |
| Screen importing a use case | ESLint | fast |
| POS importing an order screen | ESLint | fast |
| Hand-written `useMemo` for performance | review only | churn |
| Missing barrel export | `tsc` at the call site | medium |
| Missing `.test.ts` / `.stories.tsx` sibling | review only | extra round |
| Plain `error` from a Go use case | `go build` | medium |
| Chasing phantom Go type errors pre-codegen | nothing | wasted session |
| Resurrecting `controllers/` from a stale doc | review only | full rewrite |

The last two are the expensive ones, and both are pure information gaps. They go at the top.

## 4. Design decisions

### D1 — `CLAUDE.md` is a rule sheet and an index, not a second README

It answers "what will get my change rejected" and "where is the authority for X". Anything
already in `README.md` gets one line and a link. Rationale: the root file is loaded into every
session; length is a recurring cost, and prose duplicated from the README will drift out of
sync with it within two features.

**Target: ≤ 180 lines for the root file.**

### D2 — Keep the existing comment rule verbatim, at the top

The current `CLAUDE.md`'s single rule (self-explanatory code over explanatory comments) is a
real, actively-followed preference — the codebase's comments are genuinely all
constraint-or-workaround notes. It survives the rewrite unchanged and stays first.

### D3 — Three files: root + one per area

```
CLAUDE.md            orientation, traps, commands, git rules, the doc index
libs/ui/CLAUDE.md    the frontend slice: FSM use cases, handlers, forms, views, tests
apps/api/CLAUDE.md   the Go slice: domain/data/presentation, errors, migrations, mockgen
```

Nested `CLAUDE.md` files load when the agent touches files in that directory, so the
frontend's 60 lines of FSM rules are not paid for by a session that only edits Go. This also
makes Phases 1–3 three genuinely small PRs instead of one 300-line one.

**Alternative rejected:** one big root file. Simpler, but it puts the whole monorepo's rules in
every context window, and it makes the first PR large and hard to review carefully.

### D4 — Point at the ESLint config as the machine-readable layer spec

`libs/ui/.eslintrc.json` already states every import rule *with a rationale message and a TRD
reference*. `CLAUDE.md` summarises the shape in a table and then says: the authority is that
file, read it when a boundary question arises. This cannot drift, because lint failures are
the feedback loop.

### D5 — Name the stale documents explicitly, as a deny-list

A "prefer recent docs" heuristic does not work here: the stale files are in the repo root with
confident, authoritative-sounding titles, and they are *longer* than the documents that
supersede them. The root `CLAUDE.md` names all four and names what supersedes each.

### D6 — A Skill earns its place only if it is repeated *and* its failure mode is silent

Applied to the candidate list, this rejects:

- *A "write a Storybook story" skill* — one file, one obvious sibling template, and a missing
  story is visible in the Storybook sidebar. Folded into the UI slice skill instead.
- *A "run the lint/format" skill* — `npm run lint` is one command and its failure is loud.
  Folded into the verification skill, which exists for a different reason (choosing the
  *narrow* command).
- *A "review against the architecture" skill* — ESLint covers most of it. Deferred to §8; the
  subset lint cannot see becomes a checklist in `libs/ui/CLAUDE.md` instead.

And it accepts the six in §5.

### D7 — Skills carry the traps, not just the templates

A skill that only lists files to create is a worse version of "copy the sibling". Each skill in
§5 ends with a **Gotchas** section holding the specific, earned knowledge for that workflow
(the `MIGRATIONS_DIR` default, the `localhost`-not-`127.0.0.1` cookie domain, the
`api-contract` Jest stub). That is the part an agent cannot infer from a sibling file.

### D8 — Every skill names its verification command

Not "run the tests" but the exact narrow command whose green output proves the change
(`npx nx run ui:test --testPathPattern=BudgetCreate`). This is what keeps an agent from
either skipping verification or running the 15-minute full suite.

## 5. The Skills

Six skills, at `.claude/skills/<name>/SKILL.md`. Each spec below gives the frontmatter
verbatim and the section outline, so each can be written as its own PR without re-deriving the
research in §3.

---

### S1 — `verify` (Phase 4)

```yaml
---
name: verify
description: >-
  Run the right checks for a change in this Nx monorepo, narrowly, before committing or
  opening a PR. Use when asked to verify, check, test, lint, or validate a change, when
  finishing a task in this repo, or when tests/typecheck unexpectedly fail in apps/api.
---
```

**Why it earns a skill.** The correct command depends on what changed, the obvious commands
(`npm test`, `npm run lint`) are the slowest possible choice, and the Go suite has a hard
prerequisite that produces a *misleading* failure when skipped.

**Outline.**

1. **Pick the narrow command** — a what-changed → command table: `libs/ui` → `npx nx run ui:test`; `apps/api` → `generate:go` then `npx nx run api:test`; `libs/api-contract/src/api.yaml` → both generators then both suites; anything else → `npx nx affected -t test lint`.
2. **The `api-contract` prerequisite** — why a red `apps/api` on a fresh clone is not a bug; `go.work` includes a gitignored generated module; the Go generator needs a JDK.
3. **Single-file loops** — `--testPathPattern` for Jest, `go test ./domain/ -run TestBudget` for Go.
4. **Before committing** — conventional-commit subject; husky will run the *full* lint + test on commit, so having already run the narrow suite is how you avoid a 15-minute surprise.
5. **What CI will and will not run** — `pr-test.yml` is path-filtered to the `ui` and `api` unit suites; e2e only runs post-merge on `main`. So an e2e-affecting change is worth running locally, because nothing will catch it before merge.
6. **Gotchas** — `npm test` is workspace-wide; `--passWithNoTests` hides a misnamed test file; Playwright needs `npx playwright install chromium` once.

---

### S2 — `ui-feature-slice` (Phase 5)

```yaml
---
name: ui-feature-slice
description: >-
  Add or extend a frontend feature slice in libs/ui — entity, repository, finite-state-machine
  use case, handler, screen, story, composition root, page, tests. Use when adding a screen,
  list/create/update/delete flow, or use case to the POS, order, or mobile app, or when asked
  where frontend code for a feature belongs.
---
```

**Why it earns a skill.** 87 use cases and 58 handler/screen pairs built to one template, and
the template is counter-idiomatic enough that an agent writing React from instinct produces
something structurally wrong rather than merely untidy.

**Outline.**

1. **The file set**, as a table keyed to an existing slice to copy (`Budget` create/update/list is the cleanest):

   | Layer | Path | Barrel |
   |---|---|---|
   | Entity + zod form schema | `domain/entities/<Entity>.ts` | `domain/entities/index.ts` |
   | Repository interface | `domain/repositories/<entity>.ts` | `domain/repositories/index.ts` |
   | Use case FSM + test | `domain/usecases/<entity><Action>.ts` `.test.ts` | `domain/usecases/index.ts` |
   | API repository + transformer | `data/api/<entity>.ts` `.transformer.ts` | `data/api/index.ts` |
   | Mock repository | `data/mock/<entity>.ts` | `data/mock/index.ts` |
   | Handler + test | `presentation/handlers/{pos,order}/<X>Handler.tsx` `.test.tsx` | that folder's `index.ts` |
   | Screen + story | `presentation/views/screens/{pos,order}/<X>Screen.tsx` `.stories.tsx` | that folder's `index.ts` |
   | Form/list view components | `presentation/views/components/<entity>/` | that folder's `index.ts` |
   | Composition root | `app/{pos,order}/<X>.tsx` | that folder's `index.ts` |
   | Page | `apps/pos-web/src/pages/...` or `apps/order-web/...` | — |

2. **The use case is a state machine** — `extends Usecase<State, Action, Params>`; a `State` union of `type` tags intersected with a `Context`; `getNextState` as a `ts-pattern` `match([state, action])` with `.returnType<State>()` and a terminal `.otherwise(() => state)`; side effects *only* in `onStateChange`, dispatching `*_SUCCESS` / `*_ERROR`. Show the `budgetCreate.ts` skeleton.
3. **The handler** — `useUsecase(x)`, then router/toast/printer effects, then map state → screen props. Effects keyed off the same state field go in **one** `useEffect`. Per `docs/handlers.md`: one call site → inline it here; ≥2 → `presentation/handlers/hooks/`. Never create a `*Controller`.
4. **Forms** — the handler passes `defaultValues` / `onSubmit` / `isSubmitting` / `serverError` as plain values and never imports `useForm`. The form component uses `FormView` with a module-scope `zodResolver`. Link `docs/forms.md`; note the `formRef` hatch is capped at four call sites.
5. **The screen is pure** — props in, Tamagui JSX out. No use case, no repository, no `next`. A `.stories.tsx` with `fn()` args is part of the slice, not a follow-up.
6. **Composition root** — a plain function: `new QueryClient()`, `new Api*Repository(client)`, `new *Usecase(repo)`, return the Handler. No hooks (`app/order/**` bans importing `react`).
7. **Tests** — use-case test via `UsecaseTester` + `flushPromises` + `MockXRepository.setShouldFail(true)`; handler test via `@testing-library/react` with real use cases over mock repositories, asserting on accessible roles.
8. **Gotchas** — export from the barrel or it does not exist; `@gatherloop-pos/ui/pos` and `/order` are separate entry points and must not cross; no hand-written `useMemo`/`useCallback` (React Compiler) except around a `useFocusEffect` callback; a new generated symbol may need adding to `src/__mocks__/api-contract.ts`; `libs/ui` is Metro-bundled, so no `next` imports outside `utils/`.
9. **Verify** — `npx nx run ui:test --testPathPattern=<Entity>`, then `npx nx run ui:storybook` for the new story.

---

### S3 — `api-endpoint` (Phase 6)

```yaml
---
name: api-endpoint
description: >-
  Add or change a REST endpoint on the Go API — OpenAPI contract, domain entity/repository/use
  case, MySQL and mock repositories, handler/route/transformer, tests. Use when adding a
  backend endpoint, changing a request or response shape, or editing
  libs/api-contract/src/api.yaml.
---
```

**Why it earns a skill.** The contract is the source of truth for *two* generators feeding two
languages, the ordering matters (contract → generate → Go), and `*Error`/`ToErrorCode` plus the
`//go:generate mockgen` step are invisible from the outside.

**Outline.**

1. **Contract first** — edit `libs/api-contract/src/api.yaml` (5.6k lines; `operationId` is what names the generated TS function and the Go model). Then `npx nx run api-contract:generate:go` and `:generate:ts`. `__generated__` is gitignored and rebuilt; never hand-edit it.
2. **Domain** — `<feature>_entity.go`, `<feature>_repository.go` (interface, with the `//go:generate mockgen` line and `BeginTransaction`), `<feature>_usecase.go` (`NewXUsecase(repository)`, methods taking `ctx` and returning `(T, *Error)`), `<feature>_usecase_test.go`.
3. **Data** — `data/mysql/<feature>_repo.go` implements the interface; `data/mock/` is **regenerated** by `go generate ./...`, not written by hand.
4. **Presentation** — the three-file template: `<feature>_handler.go` (ctx → transformer → use case → `WriteResponse` / `WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), ...})`), `<feature>_route.go` (`gorilla/mux`, wrap with `CheckAuth`, include `http.MethodOptions` on POST/PUT for CORS preflight), `<feature>_transformer.go` (`GetXId`, `GetXRequest`, `ToApiX`, `ToX`).
5. **Wire it in `main.go`** — repository → use case → handler → router, once.
6. **Public vs authenticated** — customer-facing routes live under `/public/*` and skip `CheckAuth`; see the `publicCategoryList` pattern in `api.yaml`.
7. **Gotchas** — return `*domain.Error`, never plain `error`; the Go generator is Java and needs a JDK; a contract change is a *frontend* change too (regenerate TS, update `data/api/*.transformer.ts`); adding a field to a response without a default breaks existing clients (see `91d5451`).
8. **Verify** — `npx nx run api-contract:generate:go && npx nx run api:test`, plus `npx nx run ui:test` if the TS client changed.

---

### S4 — `db-migration` (Phase 7)

```yaml
---
name: db-migration
description: >-
  Create and run a MySQL schema migration for apps/api with golang-migrate. Use when adding,
  altering, or dropping a table or column, or when asked to write, run, or roll back a
  migration in this repo.
---
```

**Why it earns a skill.** 25 migration pairs, a one-command creation step that is easy to get
wrong by hand, and a `Makefile` default that makes the documented command fail (§3.2.7).

**Outline.**

1. **Create the pair** — `cd apps/api && make migrate-create name=add_foo_column`, which produces the next `0000NN_*.up.sql` / `.down.sql` in sequence. Never number by hand.
2. **Write both directions** — `down` must actually reverse `up`; the suite has a matching `down` for every migration and that is not decoration.
3. **Run it** — `make migrate-up` / `make migrate-down` / `make migrate-version`, and the explicit-path form CI uses when `MIGRATIONS_DIR` is unset.
4. **Propagate the change** — a column is not a feature: update the MySQL repository, the domain entity, the API contract, and the transformers on both sides. Cross-link `api-endpoint`.
5. **Gotchas** — `MIGRATIONS_DIR` defaults to `migrations` while the files are in `data/mysql/migrations`, so set it or pass `-path`; migrations are embedded via `embed.FS` but **nothing runs them at boot**; `golang-migrate` must be installed with `-tags mysql`, and `go install` refuses to run inside the `go.work` workspace (`GOWORK=off`); a backfill of existing rows belongs in the `up` file, not in application code.
6. **Verify** — `make migrate-up && make migrate-down && make migrate-up` against a local database, then `npx nx run api:test`.

---

### S5 — `write-spec` (Phase 8)

```yaml
---
name: write-spec
description: >-
  Write a PRD or TRD in this repo's docs/ house style — numbered design decisions, alternatives
  considered, and a phased delivery plan sized one phase per PR. Use when asked to plan,
  design, spec, or write a PRD/TRD/plan for a feature or refactor before implementing it.
---
```

**Why it earns a skill.** ~30 documents in a consistent and quite specific format, and this is
the *entry point* of the repo's workflow — feature work starts as a `docs/prd-*.md` or
`docs/trd-*.md`, gets `D`-numbered decisions, and is delivered as the phases that document
names. Later documents and `.env.example` comments reference those decisions by number
(`D15`, `D21`), so the numbering is load-bearing, not cosmetic.

**Outline.**

1. **Which document** — `prd-*` for "what and why, for the operator" (product behaviour, UX, alternatives); `trd-*` for "how, structurally" (architecture, refactors); `plan-*` for a pure phase breakdown of an already-agreed design. Naming is `docs/<kind>-<kebab-topic>.md`.
2. **PRD outline** — Problem Statement → Root cause → (where relevant) how the industry handles this → **Alternatives Considered**, options labelled with ✅/❌ and an explicit recommendation → Proposed Solution → Design decisions `D1..Dn` → Phased plan → Risks. Cite real files and symbols, as the existing PRDs do.
3. **TRD outline** — Problem statement → Goals / Non-goals → **Current-state audit** (with counts) → Target architecture → Design decisions `D1..Dn` → Phased delivery (tracks, if two concerns interleave) → Risks → Rollback → Deferred → Settled in review.
4. **Decision numbering** — one `D<n>` per decision, stable once written; new decisions append rather than renumber, because other documents cite them.
5. **Phase sizing** — each phase is one PR: states the files it touches, leaves `main` green and the product shippable, and names its own acceptance check. A phase that cannot be described in a paragraph is two phases.
6. **Keep the living references current** — if a decision changes a rule in `docs/handlers.md` or `docs/forms.md`, those are the permanent short-form references and get updated in the same phase.
7. **Gotchas** — supersede rather than silently rewrite (`prd-cash-flow-budgeting.md` opens with a revision note explaining why v2 replaced v1); do not create a new root-level plan file — `docs/` is where these live, and the four root-level ones are exactly the mess this avoids.

---

### S6 — `docs-site-page` (Phase 9)

```yaml
---
name: docs-site-page
description: >-
  Add or update a feature page on the VitePress documentation site in docs-site/, including its
  sidebar entry. Use when shipping a user-facing feature that needs end-user documentation, or
  when asked to update the docs site, feature catalog, or GitHub Pages content.
---
```

**Why it earns a skill.** ~20 pages, a mandated-complete feature catalog
(`docs/prd-feature-documentation-site.md`), and a page is invisible until it is hand-wired into
`docs-site/.vitepress/config.ts` — a step with no error when skipped.

**Outline.**

1. **Pick the section** — `overview/`, `sales/`, `catalog/`, `inventory/`, `finance/`, `operations/`, `under-the-hood/`.
2. **Write the page** — operator-facing voice, matching an existing sibling; screenshots in `docs-site/public/screenshots/`, diagrams in `public/diagrams/`.
3. **Wire the sidebar** — add the `{ text, link }` entry to the right `sidebar` group in `.vitepress/config.ts`. Orphan pages do not 404, they are simply unreachable.
4. **`docs-site` is its own npm project** — own `package-lock.json`, own `npm ci`, not an Nx project; run `npm run dev` (VitePress) from inside `docs-site/`.
5. **Gotchas** — `base: '/gatherloop-pos/'`, so absolute asset paths need the prefix; `deploy-pages.yml` only fires on `docs-site/**` changes; the `/order/` path prefix is redirected by an inline script to `ORDER_APP_BASE_URL` (an Actions *variable*, not a secret), so do not author pages under it.

---

### S7 — `e2e-spec` (Phase 10)

```yaml
---
name: e2e-spec
description: >-
  Write or debug a Playwright end-to-end spec for pos-web-e2e or order-web-e2e. Use when adding
  e2e coverage for a user flow, or when an e2e suite fails locally or in the post-merge E2E
  workflow.
---
```

**Why it earns a skill.** Two suites whose CI environment encodes several hard-won traps
(documented only as comments inside `e2e-main.yml`), and which run *post-merge* — so a broken
spec is found after it is too late to be cheap.

**Outline.**

1. **Where specs live**, and which app each suite drives (`pos-web-e2e` runs `nx dev pos-web`; `order-web-e2e` builds then starts `order-web`).
2. **The environment the suite assumes** — a migrated MySQL, the seeded `e2e` user (there is no registration endpoint, so the account is inserted directly), and the seeded QRIS wallet at the fixed `ORDER_PAYMENT_WALLET_ID`.
3. **Auth is pre-baked** — `pos-web-e2e`'s `global-setup.ts` logs in once into a shared `storageState.json`; specs run authenticated by default. A spec that must be anonymous goes in the `chromium-no-auth` project (`auth.spec.ts`), and a mobile-viewport spec is named `*.mobile.spec.ts` so the `mobile-chromium` project picks it up — the naming is what routes it, so a new mobile spec also needs its `testMatch`/`testIgnore` entries.
4. **Run it locally** — `npx playwright install chromium` once, then `npx nx run pos-web-e2e:e2e`; both configs are Chromium-only unless `FULL_BROWSER_MATRIX` is set.
5. **Gotchas** — use `BASE_URL=http://localhost:3000`, **not** `127.0.0.1`: the API stamps the session cookie with `Domain=<origin host>` and browsers reject a bare-IP `Domain`, so every authenticated test fails silently against the IP. Both apps default to port 3000, which is why the suites are separate CI jobs and cannot run concurrently. The QRIS flow runs against `apps/api/cmd/dokustub`, never real DOKU. `pos-mobile-e2e` is still the Nx scaffold and is not run in CI. Failures upload a Playwright report plus the API and stub logs as artifacts.
6. **Verify** — the suite green locally, since `pr-test.yml` will not run it.

---

## 6. Phased delivery

Each phase is one PR. Phases 1–3 are sequential (the root file sets up the links the area files
rely on). Phases 4–11 are independent of each other and may be reordered or parallelised;
4 and 5 are the highest value if the list is cut short.

| # | PR | Files | Size | Acceptance |
|---|---|---|---|---|
| **0** | This plan | `docs/plan-claude-md-and-skills.md` | ~350 L | Reviewer agrees the audit is right and the skill list is neither over- nor under-scoped |
| **1** | Root `CLAUDE.md` | `CLAUDE.md` | ~170 L | D2 rule still first and verbatim; every link resolves; the four stale docs named; no prose duplicated from README |
| **2** | Frontend area rules | `libs/ui/CLAUDE.md` | ~90 L | FSM/handler/form/view rules each cite their authority (`docs/handlers.md`, `docs/forms.md`, the eslintrc); the "lint cannot catch this" checklist is in it |
| **3** | Backend area rules | `apps/api/CLAUDE.md` | ~70 L | The `*Error`, `mockgen`, codegen-prerequisite and migration-path facts are all present |
| **4** | Skill: `verify` | `.claude/skills/verify/SKILL.md` | ~80 L | Every command in it runs green in a fresh clone, in the order given |
| **5** | Skill: `ui-feature-slice` | `.claude/skills/ui-feature-slice/SKILL.md` | ~150 L | File table matches an actual slice on disk; the FSM skeleton compiles |
| **6** | Skill: `api-endpoint` | `.claude/skills/api-endpoint/SKILL.md` | ~120 L | Matches the `budget` Go slice file-for-file |
| **7** | Skill: `db-migration` | `.claude/skills/db-migration/SKILL.md` | ~70 L | The `MIGRATIONS_DIR` workaround is stated and verified against the Makefile |
| **8** | Skill: `write-spec` | `.claude/skills/write-spec/SKILL.md` | ~110 L | Outlines match the headings actually used in `docs/trd-presentation-layer-architecture.md` and `docs/prd-cash-flow-budgeting.md` |
| **9** | Skill: `docs-site-page` | `.claude/skills/docs-site-page/SKILL.md` | ~60 L | Sidebar-wiring step matches `.vitepress/config.ts` |
| **10** | Skill: `e2e-spec` | `.claude/skills/e2e-spec/SKILL.md` | ~80 L | Every gotcha traceable to a comment in `e2e-main.yml` or a config file |
| **11** | *(optional)* Session bootstrap | `.claude/settings.json` | ~30 L | A `SessionStart` hook runs the two codegen targets so Go resolves from the first turn; plus an allowlist for the read-only commands these skills run |

Phase 11 is listed last and marked optional because it is the only phase that changes agent
*behaviour* rather than documentation, and it should be judged on its own: it fixes the single
most expensive trap in §3.3 (a red `apps/api` on a cold clone) at the cost of a slower session
start. There is a `session-start-hook` skill available to write it.

### Review order within each documentation PR

Ask the reviewer to check, in this order: (1) is every claim still true of the code today,
(2) is anything here already enforced by ESLint and therefore redundant, (3) is anything
missing that the reviewer has personally had to explain to a contributor more than once.

## 7. Defects found while auditing — recorded, not fixed

Out of scope per **N1**. Each is small and worth its own PR.

1. **`.github/workflows/pr-test.yml` refers to itself as `pr-tests.yml`** in both `paths-filter`
   globs (`.github/workflows/pr-tests.yml`), and `README.md` §2 cites the same wrong name. Effect:
   editing the workflow does not itself trigger either suite. One-line fix in three places.
2. **`apps/api/Makefile`'s `MIGRATIONS_DIR` default is wrong** relative to the actual
   `data/mysql/migrations` path, and `.env.example` does not set it, so the documented
   `make migrate-up` fails out of the box (§3.2.7).
3. **Four stale root-level planning documents** describing the removed `controllers/` layer.
   They are completed plans; moving them to `docs/archive/` (or deleting them, since git has
   them) removes the most expensive trap in §3.3. **This is the highest-value follow-up**, and
   D5 exists only to work around it.
4. **`apps/api/Makefile` declares `build-migrate`, `build-seed` and `seed` in `.PHONY`** but
   defines no such targets.
5. **`budgetCreate.onStateChange` has an `// TODO: IMPLEMENT SOMETHING`** in its `.otherwise`
   branch, copied across many use cases. Harmless, but it reads as unfinished work in the file
   an agent is most likely to use as the reference template — worth a pass.

## 8. Deferred

- **An `arch-review` skill** checking a diff against the rules lint cannot express (the
  `formRef` four-call-site cap, the handler-hook promotion rule, screen purity, a missing test
  or story sibling). Deferred because the generic `/code-review` skill plus the checklist in
  `libs/ui/CLAUDE.md` (Phase 2) should cover it; revisit if review rounds keep catching the
  same four things.
- **A `pos-mobile` skill.** The mobile app is a thin re-export shell today and the e2e suite is
  unmodified scaffold. Nothing is repeated often enough yet.
- **Generating the skill file tables from the filesystem.** Tempting (they would never drift),
  but a build step that writes into `.claude/` is more machinery than five tables justify.

## 9. Risks

| Risk | Mitigation |
|---|---|
| The documents drift as the architecture moves | Every rule cites its authority (a lint rule, a TRD, a file). Drift shows up as a broken citation, and D1's length cap keeps the surface small enough to re-read |
| Skills encourage copy-paste over thought | D7: each skill leads with the *shape and why*, and the gotchas are the bulk of the content. The file table is a checklist, not a generator |
| Too many skills, so the right one never triggers | Six, with disjoint descriptions keyed to distinct trigger vocabulary ("endpoint"/"migration"/"screen"/"PRD"/"e2e"/"verify") |
| `CLAUDE.md` grows until it is ignored | The 180-line cap in D1, and D3's split so area detail is paid for only when relevant |

## 10. Rollback

Every phase adds a file and changes no behaviour. Reverting any single phase is a clean
`git revert` with no dependency on any other, except that reverting Phase 1 while keeping
Phases 2–3 leaves the area files without the index that links them — cosmetic, not broken.
Phase 11 is the only phase that can affect a session's behaviour and is the only one worth
reverting on suspicion.
