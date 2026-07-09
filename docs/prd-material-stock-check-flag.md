# PRD: Material Stock-Check Flag — Exclude Unimportant Materials from Restock Checks

## Problem Statement

Every active material is treated as stock-check-relevant. When a staff member opens `/stock-checks/create`, the form is seeded with **one row per active material** (see `apps/web/src/pages/stock-checks/create.tsx`), and — since `prd-stock-check-required-fields.md` shipped — **every row must be counted** before the form can be submitted.

That "count everything" rule is correct for materials that matter (coffee beans, milk, cups), but the materials table also contains items that staff should *not* have to count on every restock check:

- long-lived items bought once a year (cleaning equipment, utensils),
- items tracked informally or restocked ad hoc,
- items kept in the catalog only for recipe cost calculation.

Today these all show up as mandatory rows on the stock check form. The practical failure modes:

> Staff walk the shelves counting 25 materials when only 18 actually need counting. The 7 irrelevant rows either slow the check down, or get rubber-stamped with a made-up number — polluting stock data and the purchase recommendations derived from it (`/stock-checks/[id]/purchase-list`).

Separately, on the **material list screen** (`/materials`) there is no way to see or filter which materials participate in stock checks. As the catalog grows, an admin cannot audit "what will staff be asked to count?" without opening the stock check form itself.

---

## Context: Existing System

- **Material entity (backend)**: `apps/api/domain/material_entity.go` — `Material` has `MinimumStock`, `NormalStock`, `PurchaseUnit`, etc. GORM entity in `apps/api/data/mysql/material_entity.go`, list/CRUD in `apps/api/data/mysql/material_repo.go`, usecase in `apps/api/domain/material_usecase.go`, REST layer in `apps/api/presentation/restapi/material_handler.go` + `material_transformer.go` + `material_route.go`.
- **List endpoint**: `GET /materials` accepts `query`, `sortBy`, `order`, `limit`, `skip` (`libs/api-contract/src/api.yaml`, `materialList` operation). Filtering happens in `GetMaterialList` / `GetMaterialListTotal` in `material_repo.go`.
- **API contract & codegen**: `libs/api-contract/src/api.yaml` is the source of truth. TypeScript client is generated with kubb (`nx generate api-contract`-style target: `rm -rf src/__generated__/ts && kubb --config kubb.config.ts`), Go contract with openapi-generator (see `libs/api-contract/project.json`).
- **Frontend material stack** (clean architecture, `libs/ui`):
  - Entity: `libs/ui/src/domain/entities/Material.ts` (`Material`, `MaterialForm`).
  - Repository interface: `libs/ui/src/domain/repositories/material.ts`; API impl `libs/ui/src/data/api/material.ts` + `material.transformer.ts`; mock impl in `libs/ui/src/data/mock/`.
  - List usecase: `libs/ui/src/domain/usecases/materialList.ts` with query-param persistence via `MaterialListQueryRepository` (`libs/ui/src/domain/repositories/materialListQuery.ts`, URL impl in `libs/ui/src/data/url/materialListQuery.ts`).
  - Screens: `MaterialListHandler.tsx` / `MaterialListScreen.tsx`, form in `components/materials/MaterialFormView.tsx`, list item in `components/materials/MaterialListItem.tsx`.
- **Stock check create seeding**: `apps/web/src/pages/stock-checks/create.tsx` fetches the material list (`itemPerPage: 1000`) in `getServerSideProps` and maps every material to a form row with `currentStock: null`. There is no mobile-specific stock check page — the seeding lives only in the web page.
- **Purchase recommendations**: `/stock-checks/[id]/purchase-list` derives "what to buy" from stock check **items**, so anything excluded from the stock check is automatically excluded from purchase recommendations. No separate change needed there.
- **Established precedents in this codebase** (follow these, don't invent new patterns):
  - Boolean flag on an entity: `wallets.is_payment_target` (`migrations/000011_add_wallet_is_payment_target.up.sql`, contract field `isPaymentTarget`).
  - List-filter enum with an `all` escape hatch: product `status` (`draft | published | all`) — contract parameter `ProductStatus`, handler helper `GetProductStatus` in `product_transformer.go`, URL persistence in `libs/ui/src/data/url/productListQuery.ts`, filter UI on `ProductListScreen`.

---

## Proposed Solution

Add a boolean flag on the material — **`isStockCheckRequired`** — that says whether the material must appear on restock checks.

1. **Data model**: new column `materials.is_stock_check_required TINYINT(1) NOT NULL DEFAULT 1`. Default `1` (required) so every existing material keeps today's behavior; excluding a material is an explicit opt-out.
2. **Material form**: a switch/checkbox on the material create/update form — "Include in stock checks" — so an admin can flag a material.
3. **Material list filter**: a new `GET /materials` query parameter and a filter control on the material list screen with three states: **All / Stock check required / Excluded**, mirroring the product status filter. A small badge on excluded materials makes the list scannable without opening each item.
4. **Stock check form**: `/stock-checks/create` seeds rows only from materials with `isStockCheckRequired = true`. Combined with the "every row must be counted" rule, this means staff count exactly the set of materials that matter — no more, no less.

### Why a positive flag (`isStockCheckRequired`) and not a negative one (`isExcludedFromStockCheck`)

- Avoids double negatives in every consumer (`!material.isExcludedFromStockCheck` reads worse than `material.isStockCheckRequired`).
- The DB default (`1` / `true`) matches the safe behavior for existing rows and for any code path that forgets to set the field: the material shows up on the check. Failing "too visible" is recoverable by staff; failing "silently missing from the check" is not.
- Matches the existing `isPaymentTarget` naming convention (positive capability flag, default on).

### Why the filter is an enum (`required | excluded | all`) and not a boolean query param

An optional boolean has three states (true/false/absent) hidden in its encoding; the product list already solved this with an explicit enum (`draft | published | all`) plumbed through the URL. Reusing that pattern keeps the handler helper, URL persistence, and screen wiring consistent — and gives the admin an explicit "Excluded" view for auditing which materials have been opted out.

### Confirmed Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Flag name | `isStockCheckRequired` (contract), `is_stock_check_required` (DB), `IsStockCheckRequired` (Go) | Positive framing; matches `isPaymentTarget` precedent. |
| Default value | `true` — both the DB default and the create-form default. | Existing behavior is preserved for all current materials; exclusion is an explicit decision. |
| Where the flag is edited | Material create/update form only. | One place to manage it; no inline toggling from the list in v1 (see Future Work). |
| Form control | Tamagui `Switch` (or `Checkbox`) labeled **"Include in stock checks"** with helper text "When off, this material will not appear on restock check forms." | A switch communicates on/off state better than a checkbox inside this form's field stack; either is acceptable — the implementation PR picks one and stays consistent. |
| List filter param | `stockCheckStatus` query param on `GET /materials`, enum `required \| excluded \| all`, optional, absent = `all`. | Mirrors the `ProductStatus` parameter exactly. |
| List filter UI | Filter control (same component/pattern as the product list status filter) next to the existing search input on `/materials`, persisted in the URL. Default `all`. | Consistency with the product list; URL persistence means a filtered view survives refresh/back. |
| Excluded-material badge | Materials with `isStockCheckRequired = false` show a small neutral badge (e.g. gray "No stock check") on their list item. Required materials get **no** badge. | Required is the steady state — flag the exception, not the rule. |
| Stock check create seeding | Fetch with `stockCheckStatus: 'required'`; excluded materials never become rows. | The whole point of the feature. |
| Existing stock checks | Untouched. `stock_check_items` snapshots are historical records; flipping a material's flag never rewrites past checks. | Stock checks are an audit trail. |
| Editing an old stock check | Edit loads the saved items as-is, even if a material has since been excluded. | Same audit-trail reasoning; the flag only gates *new* check creation. |
| Purchase recommendations | No direct change — they derive from stock check items, which already exclude flagged materials for new checks. | Free consistency; verified in acceptance. |

### Core Rules

1. **The flag never deletes data.** Excluding a material hides it from *future* stock check forms only. Past stock checks, purchase history, and recipe/cost links are untouched.
2. **Absent means required.** Any code path that doesn't know about the flag (old clients, seeds, mocks) must behave as if `isStockCheckRequired = true`. The DB default, contract default, and frontend transformer fallback all encode this.
3. **The list filter defaults to `all`.** The material list screen shows everything unless the admin explicitly filters — the flag must not make materials hard to find.
4. **Filter and search compose with AND** — `stockCheckStatus` combines with the existing `query` search in both `GetMaterialList` and `GetMaterialListTotal` (the list and its total must never disagree).
5. **One source of truth for the seeding rule.** The stock check create page expresses "required only" by passing the filter to the existing list fetch — no client-side re-filtering of an unfiltered list.

---

## Feature Requirements

### FR-1: `isStockCheckRequired` flag on the material (backend + contract)

Make the flag exist end-to-end: persisted, returned by every material read, settable on create/update.

**Requirements:**

- Migration `000017_add_material_stock_check_flag.up.sql`:
  `ALTER TABLE materials ADD COLUMN is_stock_check_required TINYINT(1) NOT NULL DEFAULT 1;`
  plus the matching `.down.sql` dropping the column.
- Add `IsStockCheckRequired bool` to `domain.Material` (`material_entity.go`) and the GORM `mysql.Material` entity; map it in `material_transformer.go` (mysql) both directions.
- Add `isStockCheckRequired` to the `Material` schema (required, `type: boolean`) and `MaterialRequest` schema (required) in `libs/api-contract/src/api.yaml`; map it in the REST transformer (`presentation/restapi/material_transformer.go`).
- Regenerate the kubb TS client and the Go contract package.
- Frontend passthrough so the generated required field compiles: add `isStockCheckRequired: boolean` to the `Material` entity and `MaterialForm` (`libs/ui/src/domain/entities/Material.ts`), map it in `toMaterial` / `toApiMaterial` (`material.transformer.ts`), and update mock data (`libs/ui/src/data/mock/material.ts`) and the material seeder (`apps/api/seeds/material_seeder.go`) as needed. Create-form default: `true`.
- No behavior change anywhere: no filtering, no UI control yet.

### FR-2: Edit the flag on the material form

**Requirements:**

- Add an **"Include in stock checks"** switch to `MaterialFormView.tsx`, placed after "Normal Stock" (it belongs with the inventory fields), with helper text explaining the effect.
- `MaterialCreateController` defaults the field to `true`; `MaterialUpdateController` loads the saved value. Zod schemas in both controllers accept the boolean.
- Saving the form persists the flag; reopening the material shows the saved state.

### FR-3: Filter the material list by the flag (backend + contract)

**Requirements:**

- New optional query parameter on `GET /materials` in `api.yaml`:
  ```yaml
  MaterialStockCheckStatus:
    name: stockCheckStatus
    in: query
    schema:
      type: string
      enum: [required, excluded, all]
  ```
- Handler helper `GetMaterialStockCheckStatus(r)` in `presentation/restapi/material_transformer.go` (modeled on `GetProductStatus`); absent/invalid → `all`.
- Thread the filter through `MaterialUsecase.GetMaterialList` and both repository methods. In `material_repo.go`:
  - `required` → `WHERE is_stock_check_required = 1`
  - `excluded` → `WHERE is_stock_check_required = 0`
  - `all` → no clause.
  - Applied identically in `GetMaterialList` and `GetMaterialListTotal`.
- Regenerate clients. Extend the frontend `MaterialRepository` interface and `ApiMaterialRepository.fetchMaterialList` / `getMaterialList` params with `stockCheckStatus` (default `'all'`).

### FR-4: Filter control + badge on the material list screen

**Requirements:**

- Extend `MaterialListQueryRepository` with `getStockCheckStatus` / `setStockCheckStatus` (`'required' | 'excluded' | 'all'`); implement in the URL repo (`data/url/materialListQuery.ts`, query param `stockCheckStatus`, fallback `all`) and the mock repo.
- Extend `MaterialListUsecase` context/params/`CHANGE_PARAMS` with `stockCheckStatus`, passed to every repository fetch; changing the filter resets `page` to 1 (same as search).
- `MaterialListHandler` / `MaterialListScreen`: render the three-state filter using the same component/pattern as the product list status filter, next to the search input. Labels: **All / Stock check / Excluded** (or equivalent — implementation PR picks final copy).
- `MaterialListItem`: accept `isStockCheckRequired` and render a small neutral badge (e.g. "No stock check") when `false`. No badge when `true`.
- Update relevant Storybook stories (`MaterialList.stories.tsx`, `MaterialListItem.stories.tsx`, `MaterialListScreen.stories.tsx`) to cover both states.

### FR-5: Stock check create form seeds only required materials

**Requirements:**

- `apps/web/src/pages/stock-checks/create.tsx`: pass `stockCheckStatus: 'required'` to `fetchMaterialList` in `getServerSideProps`. Excluded materials never appear as rows.
- The "N / M materials checked" progress counter and pending-row validation (from `prd-stock-check-required-fields.md`) automatically reflect the smaller set — no changes needed there.
- Stock check **edit** (`/stock-checks/[id]/edit`) is untouched: it loads saved items, including items for materials that have since been excluded.
- Purchase list (`/stock-checks/[id]/purchase-list`): verify (no code change expected) that recommendations for a new check no longer include excluded materials.

---

## Non-Functional Requirements

- **No new dependencies.** Tamagui, react-hook-form, zod, ts-pattern, GORM cover everything.
- **Backward compatible API.** `stockCheckStatus` is optional; omitting it returns today's results. `isStockCheckRequired` is additive on responses. The only breaking-ish change is `MaterialRequest` requiring the field — the contract and all first-party clients regenerate together in the same PR (FR-1), so no window of inconsistency ships.
- **Migration is safe on live data.** Single `ALTER TABLE ... ADD COLUMN ... DEFAULT 1`; no backfill needed; reversible via the down migration.
- **List/total consistency.** Any filter combination returns a list and a `meta.total` computed under identical WHERE clauses (covered by handler/usecase tests).
- **No regression to product/wallet filters** or to other consumers of the material list (product variant material pickers must keep showing *all* materials — they don't pass the new param, and `all` is the default).
- **Tests follow existing patterns**: usecase tests in `apps/api/domain/material_usecase_test.go`, handler tests in `material_handler_test.go`, frontend usecase tests alongside `materialList.test.ts`, handler tests like `MaterialListHandler.test.tsx`.

---

## Implementation Phases

Each phase is a self-contained, independently shippable, small PR. Recommended merge order is **1 → 2 → 3 → 4 → 5**; every intermediate state is deployable:

- After Phase 1 the flag exists but nothing reads it — invisible to users.
- After Phase 2 admins can set the flag, but it has no effect yet — harmless.
- After Phase 3 the API can filter, but no UI sends the param — harmless.
- After Phase 4 admins can filter the material list and see badges.
- After Phase 5 the stock check form actually shrinks — the user-facing payoff.

### Phase 1 — Flag end-to-end plumbing (FR-1)

**Files touched:**

- `apps/api/migrations/000017_add_material_stock_check_flag.up.sql` / `.down.sql` (new)
- `apps/api/domain/material_entity.go`, `apps/api/data/mysql/material_entity.go`, `apps/api/data/mysql/material_transformer.go`
- `apps/api/presentation/restapi/material_transformer.go`
- `apps/api/seeds/material_seeder.go` (set the flag explicitly on seed data)
- `libs/api-contract/src/api.yaml` (+ regenerated `src/__generated__/*`)
- `libs/ui/src/domain/entities/Material.ts`, `libs/ui/src/data/api/material.transformer.ts`, `libs/ui/src/data/mock/material.ts`
- Controllers' create-form default (`MaterialCreateController.tsx`): include `isStockCheckRequired: true` in default values so `toApiMaterial` sends it (no visible control yet)

**Acceptance:**

- Migration up + down run clean on an existing database; existing rows read back `is_stock_check_required = 1`.
- `GET /materials` and `GET /materials/{id}` return `isStockCheckRequired: true` for existing materials.
- Creating/updating a material through the existing UI (no visible change) persists `isStockCheckRequired: true`.
- Sending `isStockCheckRequired: false` in a raw `PUT /materials/{id}` request persists and is returned on subsequent reads.
- Go tests, TS typecheck, and existing test suites pass.

**Out of scope:** any UI control, any filtering.

### Phase 2 — "Include in stock checks" switch on the material form (FR-2)

**Files touched:**

- `libs/ui/src/presentation/components/materials/MaterialFormView.tsx`
- `libs/ui/src/presentation/controllers/MaterialCreateController.tsx`, `MaterialUpdateController.tsx` (zod schema + defaults/loaded values)
- `libs/ui/src/presentation/components/materials/MaterialFormView.stories.tsx`
- `MaterialCreateHandler.test.tsx` / `MaterialUpdateHandler.test.tsx` if they assert form payloads

**Acceptance:**

- Create form shows the switch, defaulted **on**; submitting without touching it persists `true`.
- Turning it off and saving persists `false`; reopening the material shows the switch off.
- Update form loads the saved value correctly for both states.
- No other form field's behavior changes.

**Out of scope:** list filtering, badges, stock check seeding.

### Phase 3 — `stockCheckStatus` filter on `GET /materials` (FR-3)

**Files touched:**

- `libs/api-contract/src/api.yaml` (new `MaterialStockCheckStatus` parameter on `materialList`) + regenerated clients
- `apps/api/presentation/restapi/material_transformer.go` (param helper), `material_handler.go`
- `apps/api/domain/material_repository.go`, `material_usecase.go`, `apps/api/data/mysql/material_repo.go`, `apps/api/data/mock/material_repository.go` (regenerated)
- `apps/api/domain/material_usecase_test.go`, `apps/api/presentation/restapi/material_handler_test.go`
- `libs/ui/src/domain/repositories/material.ts`, `libs/ui/src/data/api/material.ts` (param plumbed through, default `'all'`)

**Acceptance:**

- `GET /materials?stockCheckStatus=required` returns only flagged-required materials; `=excluded` only opted-out ones; `=all`, invalid values, and omission return everything.
- `meta.total` agrees with the filtered list for every filter value, including combined with `query` search.
- All existing callers (no param) see unchanged responses.
- Backend + frontend test suites pass.

**Out of scope:** any UI.

### Phase 4 — Material list screen filter + badge (FR-4)

**Files touched:**

- `libs/ui/src/domain/repositories/materialListQuery.ts`, `libs/ui/src/data/url/materialListQuery.ts`, `libs/ui/src/data/mock/materialListQuery.ts`
- `libs/ui/src/domain/usecases/materialList.ts` (+ `materialList.test.ts`)
- `libs/ui/src/presentation/screens/MaterialListHandler.tsx`, `MaterialListScreen.tsx` (+ stories, + `MaterialListHandler.test.tsx`)
- `libs/ui/src/presentation/components/materials/MaterialList.tsx`, `MaterialListItem.tsx` (+ stories)
- `apps/web/src/pages/materials/index.tsx` if the server-side fetch needs the param for URL-restored state

**Acceptance:**

- `/materials` shows the three-state filter next to search, defaulting to **All**.
- Selecting "Stock check" / "Excluded" refetches with the right param, resets to page 1, and updates the URL (`?stockCheckStatus=...`); refreshing the page restores the filtered view.
- Filter AND-composes with the search input.
- Excluded materials show the badge in every filter view; required materials show none.
- Pagination totals are correct under each filter.

**Out of scope:** stock check seeding.

### Phase 5 — Stock check create excludes flagged materials (FR-5)

**Files touched:**

- `apps/web/src/pages/stock-checks/create.tsx` (pass `stockCheckStatus: 'required'`)

**Acceptance:**

- With at least one excluded material in the catalog, `/stock-checks/create` renders rows only for required materials; the progress counter total matches the required count.
- Submitting the check creates `stock_check_items` only for the listed materials.
- Editing a **pre-existing** stock check that contains a now-excluded material still shows and saves that row (audit trail preserved).
- The purchase list for a new check contains no excluded materials.

**Out of scope:** retroactive changes to old checks; mobile-specific pages (none exist for stock checks).

---

## Future Work (explicitly deferred, not in this PRD)

- **Inline flag toggle from the material list** (flip the switch without opening the edit form). Nice ergonomics; adds a mutation path to the list screen that doesn't exist today. Wait for demand.
- **Excluded-count indicator on the stock check form** (e.g. "7 materials excluded from this check — manage in Materials"). Cheap transparency; add if staff are ever confused about a "missing" material.
- **Per-check overrides** — include a normally-excluded material in one specific check without changing its flag. Requires check-level state; out of scope.
- **Category-level defaults** — mark an entire category as stock-check-exempt. Revisit if per-material flagging proves tedious at scale.
- **Filtering other material pickers** (product variant material selector) by the flag. Deliberately *not* done — recipes may legitimately use materials that aren't stock-checked.
