# apps/api — backend slice rules

This loads alongside the root `CLAUDE.md` for changes under `apps/api`. The root file has the
cross-cutting rules and the doc index, including the codegen trap that makes a fresh clone
fail to compile; this file is the concrete shape of a Go feature — domain, data, presentation,
migrations — with the skeleton for each and the checklist review actually catches here.

## A feature is domain → data → presentation, one file per concern

Use `budget` (`domain/budget_*.go`, `data/mysql/budget_*.go`, `presentation/restapi/budget_*.go`)
as the reference slice; every feature in `domain/` follows the same three-file-per-layer shape:

| Layer | File | Shape |
|---|---|---|
| Entity | `domain/<feature>_entity.go` | plain struct |
| Repository interface | `domain/<feature>_repository.go` | interface returning `(T, *Error)`, plus `//go:generate mockgen -source=<feature>_repository.go -destination=../data/mock/<feature>_repository.go -package=mock` |
| Use case | `domain/<feature>_usecase.go`, `_usecase_test.go` | `New<Feature>Usecase(repository)`, methods taking `ctx` and delegating to the repository |
| MySQL repository | `data/mysql/<feature>_repo.go`, `<feature>_entity.go`, `<feature>_transformer.go` | implements the domain interface with `gorm.DB` |
| Mock repository | `data/mock/<feature>_repository.go` | generated — never hand-edit |
| Handler | `presentation/restapi/<feature>_handler.go`, `_handler_test.go` | ctx → transformer → use case → `WriteResponse`/`WriteError` |
| Route | `presentation/restapi/<feature>_route.go` | `gorilla/mux`, wrapped in `CheckAuth` |
| Transformer | `presentation/restapi/<feature>_transformer.go` | `Get<Feature>Id`, `Get<Feature>Request`, `ToApi<Feature>`, `To<Feature>` |

Wire it into `main.go` once: repository → use case → handler → router, in that order, next to
the `budget*` lines.

## The contract is the source of truth, generated code is not

`libs/api-contract/src/api.yaml` defines every request/response shape; `operationId` names the
generated TS function and Go model. Edit the contract first, then run
`npx nx run api-contract:generate:go` and `:generate:ts` before touching the Go types —
`libs/api-contract/src/__generated__` is gitignored and rebuilt from the contract, never edited
by hand. A contract change is a frontend change too: regenerate the TS client and update the
matching `data/api/*.transformer.ts` in `libs/ui`. Adding a response field with no default
breaks existing clients.

## Errors are `*domain.Error`, never plain `error`

A use case method returns `(T, *domain.Error)` (`domain/base_entity.go`), not `(T, error)` — the
handler maps `err.Type` to an API status via `ToErrorCode(err.Type)` when writing
`apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message}`. A method that returns a
plain `error` instead compiles in the use case and data layer and only breaks at the handler's
call site, where the mapping has nothing to map.

## Public vs authenticated routes

Every `<feature>_route.go` wraps its handler in `CheckAuth` (`presentation/restapi/base_middlewares.go`).
Customer-facing routes that must skip auth live in `presentation/restapi/public_route.go`/`public_handler.go`
under `/public/*` instead (see the `publicCategoryList`-style entries in `api.yaml`) — do not
strip `CheckAuth` from an existing authenticated route to make it public. `POST`/`PUT` routes
also list `http.MethodOptions` for CORS preflight.

## Migrations

`apps/api/data/mysql/migrations` holds `golang-migrate` up/down pairs, embedded via `embed.FS`
but **not run at boot** — `make migrate-up` (from `apps/api`) is the only thing that applies
them. Create a pair with `make migrate-create name=add_foo_column`, never by hand-numbering, and
write a `down` that actually reverses the `up`. The `Makefile`'s `MIGRATIONS_DIR` defaults to
`migrations`, but the files are in `data/mysql/migrations`, so `make migrate-up` fails until you
`export MIGRATIONS_DIR=data/mysql/migrations` or pass `-path data/mysql/migrations` explicitly,
the way CI does. A schema change is not the whole feature — the MySQL repository, the domain
entity, the API contract, and both transformers need the same field.

## What lint cannot catch here

- A use case method returning plain `error` instead of `*domain.Error` — `go build` only flags it
  at the handler, not at the method itself.
- `data/mock/` edited by hand instead of regenerated with `go generate ./...` after a repository
  interface changes.
- A new route left off `CheckAuth`, or a public route added to an authenticated router instead of
  `public_route.go`.
- A contract field change shipped without regenerating the TS client, so `libs/ui` silently keeps
  building against the stale generated type until someone notices the API response doesn't match.
- Chasing Go type errors before running codegen — see the root `CLAUDE.md`'s first trap.

## Verify

`npx nx run api-contract:generate:go && npx nx run api:test` is the narrow loop for a backend
change; add `npx nx run ui:test` if the contract change touched a TS-facing shape. For a single
use case: `go test ./domain/ -run TestBudget`.
