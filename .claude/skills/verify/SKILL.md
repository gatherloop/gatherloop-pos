---
name: verify
description: >-
  Run the right checks for a change in this Nx monorepo, narrowly, before committing or
  opening a PR. Use when asked to verify, check, test, lint, or validate a change, when
  finishing a task in this repo, or when tests/typecheck unexpectedly fail in apps/api.
---

# verify

Pick the narrowest command that proves a change, not `npm test` / `npm run lint` — those run
the whole workspace and are the slowest possible choice. See the root `CLAUDE.md` for the
codegen trap and area `CLAUDE.md` files for what each slice's tests actually cover.

## Pick the command from what changed

| Changed | Command |
|---|---|
| `libs/ui/**` (or anything under `app/`, `presentation/`, `domain/`, `data/` there) | `npx nx run ui:test` |
| `apps/api/**` | `npx nx run api:test` — this target `dependsOn` `api-contract:generate:go`, so Nx runs codegen for you |
| `libs/api-contract/src/api.yaml` | `npx nx run api-contract:generate:go && npx nx run api-contract:generate:ts && npx nx run api:test && npx nx run ui:test` — the contract feeds both languages, so both suites need to pass |
| `docs-site/**` only | nothing here applies; see the `docs-site-page` skill |
| Anything else, or unsure | `npx nx affected -t test lint` |

## The `api-contract` prerequisite

`go.work` declares `./libs/api-contract/src/__generated__/go` as a workspace member, and that
path is gitignored. A fresh clone, or any session that hasn't run codegen yet, will show a red
`apps/api` with import errors that look like a bug in the Go code — it isn't. `npx nx run
api:test` already depends on `api-contract:generate:go` and runs it first; a bare `go build` or
opening Go files directly does not, so run `npx nx run api-contract:generate:go` yourself before
trusting a manual `go build`/type-check. The generator (`openapi-generator-cli`) is a Java
program and needs a JDK on `PATH`.

## Single-file loops

- Jest (frontend): `npx nx run ui:test --testPathPattern=<Entity>`, e.g.
  `--testPathPattern=BudgetCreate`.
- Go: `go test ./domain/ -run TestBudget` (from `apps/api`), after codegen has run at least once
  in the workspace.

## Before committing

Commit subjects are conventional-commit format, enforced by commitlint on husky's `commit-msg`
hook. `.husky/pre-commit` runs `npm run lint` **and** `npm test` — the full workspace, every
time — so run the narrow command above first; discovering a failure at commit time after
already having run the narrow suite is the surprise this skill exists to avoid, not a redundant
step.

## What CI will and will not run

`.github/workflows/pr-test.yml` is path-filtered: it runs the `ui` suite only when `libs/ui/**`
(or a handful of shared files) changed, and the `api` suite only when `apps/api/**` or the
contract changed. Playwright e2e (`pos-web-e2e`, `order-web-e2e`) only runs post-merge, on
pushes to `main` (`.github/workflows/e2e-main.yml`) — nothing runs it before merge. If a change
plausibly affects an end-to-end flow, run the relevant e2e suite locally; see the `e2e-spec`
skill for how.

## Gotchas

- `npm test` and `npm run lint` (root scripts) are `nx run-many --all` — they run every project
  in the workspace, Go included, and take far longer than the narrow command above.
- `npm test`'s `--passWithNoTests` flag means a misnamed test file (wrong extension, wrong
  suffix) silently contributes zero tests instead of failing — a green `npm test` is not proof
  your new test file was picked up; check its name matches an existing sibling's.
- Playwright needs its browser once per environment: `npx playwright install --with-deps
  chromium` (CI does this via the `e2e-main.yml` step of the same name).
- `npx nx affected` compares against the base branch; run it from a branch with the intended
  diff already committed, or it may see nothing to affect.
