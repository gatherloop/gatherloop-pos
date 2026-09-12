---
name: api-endpoint
description: >-
  Add or change a REST endpoint on the Go API — OpenAPI contract, domain entity/repository/use
  case, MySQL and mock repositories, handler/route/transformer, tests. Use when adding a
  backend endpoint, changing a request or response shape, or editing
  libs/api-contract/src/api.yaml.
---

# api-endpoint

~25 Go features are built to one template: a contract entry feeding two generators, then
domain → data → presentation, one file per concern. The `budget` slice (`domain/budget_*.go`,
`data/mysql/budget_*.go`, `presentation/restapi/budget_*.go`) is the cleanest full example;
every path and snippet below is real, not illustrative.

## 1. Contract first

`libs/api-contract/src/api.yaml` (5.6k lines) is the source of truth for every request/response
shape; its `operationId` names the generated TS function and Go model (`publicCategoryList` is
the naming pattern for a public one). Add or edit the entry there first, then run:

```bash
npx nx run api-contract:generate:go
npx nx run api-contract:generate:ts
```

`libs/api-contract/src/__generated__` is gitignored and fully rebuilt by these — never hand-edit
it, and never write Go against it before regenerating.

## 2. Domain

| File | Shape |
|---|---|
| `domain/<feature>_entity.go` | a plain struct (`Budget{Id, Name, Percentage, DeletedAt, CreatedAt}`) |
| `domain/<feature>_repository.go` | an interface returning `(T, *domain.Error)`, plus `BeginTransaction`, plus a leading `//go:generate mockgen -source=<feature>_repository.go -destination=../data/mock/<feature>_repository.go -package=mock` comment |
| `domain/<feature>_usecase.go`, `_usecase_test.go` | `New<Feature>Usecase(repository)`, methods taking `ctx` and delegating straight to the repository |

The usecase is usually a thin pass-through — `BudgetUsecase.GetBudgetList` is one line calling
`usecase.repository.GetBudgetList(ctx)`. Business logic that needs more than one repository call
(cross-entity validation, orchestration) still lives here, not in the handler or the MySQL layer.

Usecase tests use `gomock` against the **generated** mock, not a hand-written fake:

```go
mockRepo := mock.NewMockBudgetRepository(ctrl)
mockRepo.EXPECT().GetBudgetList(gomock.Any()).Return([]domain.Budget{...}, nil)
usecase := domain.NewBudgetUsecase(mockRepo)
```

Drive the error branch by returning `&domain.Error{Type: domain.InternalServerError, ...}` (or
`domain.NotFound`, `domain.BadRequest`) from the mock instead of a value.

## 3. Data

- `data/mysql/<feature>_repo.go` implements the domain interface with `gorm.DB`, pulled from the
  context via `GetDbFromCtx(ctx, repo.db)` so it composes with `BeginTransaction`. Soft-delete is
  a `deleted_at` timestamp update, not a row delete (`DeleteBudgetById`). Also
  `<feature>_entity.go` (the GORM row struct) and `<feature>_transformer.go`
  (`To<Feature>Domain` / `To<Feature>DB`) in the same package.
- `data/mock/<feature>_repository.go` is **generated** by the `//go:generate mockgen` line above,
  run via `go generate ./...` from `apps/api` — never hand-edit it after a repository interface
  changes; regenerate instead.

## 4. Presentation

Three files per feature in `presentation/restapi/`:

- **`<feature>_handler.go`** — `ctx := r.Context()`, decode the request via the transformer,
  call the usecase, and on a `*domain.Error` write
  `WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})` and
  `return`; on success, `WriteResponse(w, apiContract.<Feature><Action>Response{Data: ...})`. A
  request-decode failure (not a usecase error) writes `apiContract.BAD_REQUEST` directly, not
  through `ToErrorCode`.
- **`<feature>_route.go`** — `gorilla/mux`, every route wrapped in `CheckAuth`; `POST`/`PUT`
  routes list `http.MethodOptions` alongside their verb for CORS preflight
  (`.Methods(http.MethodPost, http.MethodOptions)`).
- **`<feature>_transformer.go`** — `Get<Feature>Id` (path param via `mux.Vars`), 
  `Get<Feature>Request` (JSON body decode), `ToApi<Feature>` (domain → contract), 
  `To<Feature>` (contract request → domain, for create/update).

## 5. Wire it into `main.go`

Once, next to the existing `budget*` lines, in this order: repository → usecase → handler →
router (`mysql.NewBudgetRepository(db)` → `domain.NewBudgetUsecase(...)` →
`restapi.NewBudgetHandler(...)` → `restapi.NewBudgetRouter(...).AddRouter(router)`). Skipping a
step compiles; the route is just never reachable.

## 6. Public vs authenticated

Every `<feature>_route.go` wraps its handlers in `CheckAuth`. A customer-facing route that must
skip auth (contract tag `public`, e.g. `publicCategoryList`) does **not** get its own
`CheckAuth`-free route file next to the authenticated ones — it goes in the existing
`presentation/restapi/public_route.go` / `public_handler.go` / `public_transformer.go`, under
`/public/*`, alongside `GetCategoryList`, `GetProductList`, etc. Do not strip `CheckAuth` from an
existing authenticated route to make it public.

## Gotchas

- Return `*domain.Error`, never a plain `error`, from a usecase method — it compiles fine through
  the usecase and data layer and only breaks at the handler's `ToErrorCode(err.Type)` call, where
  there's nothing to map.
- The Go generator (`openapi-generator-cli`) is a Java program and needs a JDK on `PATH`.
- A contract change is a frontend change too: regenerate the TS client
  (`api-contract:generate:ts`) and update the matching `data/api/*.transformer.ts` in `libs/ui` —
  see the `ui-feature-slice` skill.
- Adding a response field with no default breaks existing clients still running the old
  generated type (see commit `91d5451`); give new fields a safe zero value.
- `data/mock/` is regenerated output — if you edit the repository interface and forget
  `go generate ./...`, the mock still compiles against the *old* interface and every caller of
  the new method fails at the mock, not at the interface.
- Handler tests build a **real usecase over the generated mock repository**
  (`restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))`) and drive it with
  `httptest.NewRequest` / `httptest.NewRecorder`, asserting on `w.Code` — never a mocked usecase.

## Verify

```bash
npx nx run api-contract:generate:go && npx nx run api:test
```

Add `npx nx run ui:test` if the contract change touched a TS-facing shape. For a single feature:
`go test ./domain/ -run TestBudget` (from `apps/api`, after codegen has run at least once).
