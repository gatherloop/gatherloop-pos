# Instructions for Claude

- Do not add explanatory comments to code. Write self-explanatory code
  through naming instead. Only add a comment when it captures a genuinely
  non-obvious constraint or workaround that the code itself cannot express —
  and keep it to one short line, not a paragraph.

This file is a rule sheet and an index: what will get a change rejected, and where the
authority for a topic actually lives. `README.md` already covers project structure, run/test
commands, and the architecture diagrams — read it first. This file does not repeat it.

## Two traps that cost a whole session if missed

1. **`apps/api` will not compile on a fresh clone until codegen has run.** `go.work` declares
   `./libs/api-contract/src/__generated__/go` as a workspace member, and that path is
   gitignored. A red `apps/api` before you've run codegen is not a bug in the code — run:

   ```bash
   npx nx run api-contract:generate:go
   npx nx run api-contract:generate:ts
   ```

   The Go generator (`openapi-generator-cli`) is a Java program and needs a JDK on `PATH`.
   `dev`/`build`/`serve` targets run codegen automatically; only a bare `go build` or opening
   Go files directly can hit this.

2. **Four root-level planning docs are stale.** They predate the handler/controller merge
   (`docs/trd-presentation-layer-architecture.md`) and describe layers or plans that no longer
   match the code. Do not use them as a source of convention:
   - `plan.md` — Storybook setup plan; Storybook already exists (`npx nx run ui:storybook`).
   - `TESTING_REVIEW.md`, `E2E_TEST_PLAN.md`, `HANDLER_INTEGRATION_TESTS_PLAN.md` — describe a
     `presentation/controllers/` layer that has since been removed. `docs/handlers.md` is the
     current rule; it explicitly retires the word "controller".

## Layer boundaries are enforced by ESLint, not by convention

Both sides are Clean Architecture (`domain → data → presentation`, domain depends on nothing).
On the frontend the import boundaries between `domain/usecases`, `presentation/handlers`,
`presentation/views/screens`, `presentation/views/components`, `app/pos`, and `app/order` are
`no-restricted-imports` rules in `libs/ui/.eslintrc.json`, each with a `message` naming the rule
and its TRD. That file is the authority for "can X import Y" — when in doubt, read the relevant
`message` there rather than guessing from a sibling file.

The load-bearing rules that message text carries:

- A screen imports no usecase, no repository, no `next` — pure props in, JSX out.
- A handler owns `useUsecase` and all router/toast/printer effects for its screen; a hook
  shared by ≥2 handlers is promoted to `presentation/handlers/hooks/` (`docs/handlers.md`).
- `useForm` and `@hookform/resolvers/zod` belong to the form component, never a handler —
  `docs/forms.md` has the `FormView` contract and the four-call-site `formRef` escape hatch.
- `app/order/**` bans importing `react` outright: a composition root is a plain function that
  news up repositories and use cases and returns one Handler, not a component.
- POS and order are separate import graphs (`@gatherloop-pos/ui/pos` vs. `@gatherloop-pos/ui/order`);
  neither may reach into the other's `screens/`, `handlers/`, or `app/` — see
  `docs/trd-ui-presentation-split-by-app.md`.
- No hand-written `useMemo`/`useCallback`/`React.memo` — every surface builds with the React
  Compiler (`docs/trd-react-compiler-adoption.md`). The one exception is `useCallback` around a
  `useFocusEffect` callback, because Jest has no compiler pass.

## What lint cannot catch

- **A frontend use case is a finite state machine**, not `useState`/`useEffect` in a handler:
  `extends Usecase<State, Action, Params>`, a `getNextState` reducer, side effects only in
  `onStateChange`. This passes `tsc` even when written the React-idiomatic way, and is caught
  only in review — it is the most expensive mistake to make here.
- **Barrel discipline.** A new entity/use case/repository/handler/screen/component/app-root is
  invisible to its consumers until it is exported from that folder's `index.ts`.
- **A missing `.test.ts` next to a use case, or `.test.tsx`/`.stories.tsx` next to a
  handler/screen** is not caught by any tool — it shows up as an extra review round.
- **Go use case methods return `(T, *domain.Error)`, not `(T, error)`.** The REST handler maps
  it to a response code via `ToErrorCode(err.Type)`; a plain `error` return breaks that mapping
  at the handler, not at the use case.
- **`data/mock/` on the Go side is generated, not hand-written** — via the `//go:generate
  mockgen` directive on each `*_repository.go`, run through `go generate ./...`.
- **Migrations are embedded (`embed.FS`) but nothing runs them at boot.** The `golang-migrate`
  CLI (`make migrate-up` in `apps/api`) is the only path that applies them.
- **`apps/api/Makefile`'s `MIGRATIONS_DIR` defaults to `migrations`**, but the migration files
  live in `data/mysql/migrations`, and `.env.example` does not set the variable — the
  documented `make migrate-up` fails until you export `MIGRATIONS_DIR=data/mysql/migrations` or
  pass `-path` explicitly, the way CI does.

## Tests

- Frontend use cases are tested with `UsecaseTester` + `flushPromises`
  (`libs/ui/src/utils/usecase.ts`); the error branch is driven with
  `MockXRepository.setShouldFail(true)`.
- Handler tests use `@testing-library/react` with **real use cases over mock repositories** —
  never a mocked use case — asserting on accessible roles.
- `libs/ui`'s Jest config stubs `api-contract` entirely (`src/__mocks__/api-contract.ts`), plus
  `tamagui`, `solito`, `react-native`, `next/router`. A UI test never needs codegen to run, but
  a newly generated symbol used under `data/api/` may need adding to that stub.
- `npm test` and `npm run lint` run the whole workspace, and husky's `pre-commit` runs both —
  that is the 15-minute check, not the one to run in a loop. The narrow commands are
  `npx nx run ui:test` / `npx nx run api:test`, or `npx nx affected -t test lint`. CI itself
  (`.github/workflows/pr-test.yml`) only runs the two path-filtered unit suites; the Playwright
  e2e suites run post-merge only (`.github/workflows/e2e-main.yml`), so an e2e-affecting change
  is worth running locally — nothing else will catch it before merge.

## Git

- Commits are conventional-commit format, enforced by commitlint on `commit-msg`.

## Where to look next

- `README.md` — project structure, run/test/codegen commands, both architecture diagrams.
- `docs/handlers.md` — the handler shape and the hook promotion rule.
- `docs/forms.md` — `useForm` ownership and the `FormView` contract.
- `libs/ui/.eslintrc.json` — the machine-readable statement of every layer boundary, with
  rationale in each `message`.
- `docs/trd-presentation-layer-architecture.md` — the full audit behind the handler/view split.
- `docs/trd-react-compiler-adoption.md` — why no hand-written memoization.
- `docs/trd-order-app-composition-and-ssr.md` — why `libs/ui` may not import `next` outside
  `utils/`, and the `app/order` composition-root shape.
- `docs/` more broadly — a PRD or TRD per feature; read the relevant one before changing
  behaviour it covers.
