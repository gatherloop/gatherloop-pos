# PRD: Inventory Management

## Problem Statement

The cafe consumes raw materials (tepung, bubuk matcha, susu, sirup, etc.) throughout each operating day. Today, the crew has no structured way to:

1. **Record what is left in the storeroom** at the end of the day. Counts happen on paper or in chat, are easy to lose, and cannot be audited later.
2. **Decide what to buy the next morning.** The opening crew has to eyeball the storeroom and guess what is "running low" — leading either to stockouts during service or to over-purchasing of materials that are not yet needed.

The POS system already knows each material's **recipe-unit price** (e.g. price per gram) and is used by the variant/recipe module, but it does **not** know:

- How material is purchased (1 Kg sack? 1 Box? 1 Bottle?)
- What the **minimum acceptable stock** for each material is
- What the **target / normal stock** level is
- What the **current stock on hand** actually is

Without those four pieces of information the system cannot generate a useful shopping list.

---

## Context: Existing System

- **Backend**: Go REST API + MySQL, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations`.
- **Frontend**: Next.js web app + React Native mobile app, sharing `libs/ui` (Tamagui). Data fetched through generated React Query hooks from `libs/api-contract`.
- **Material entity** (`apps/api/domain/material_entity.go`) today: `Id`, `Name`, `Price`, `Unit`, `WeeklyUsage`, `Description`, soft-delete timestamps. `Unit` is the **recipe unit** (Gram, ML, …) and `Price` is **per recipe unit**.
- **No prior art** for stock-tracking, inventory snapshots, or shopping lists. This is a new module.
- **Auth**: JWT, no RBAC. Any logged-in crew member can record stock and view the purchase list.

---

## Proposed Solution

Introduce two new concepts on top of the existing `Material` model:

| Concept | Description |
|---|---|
| **Stock Check** | A dated record, created by the closing crew, of how much of each material is currently in the storeroom. Equivalent to "Closing Stock Count for 2026-05-15". Covers **every** material in the catalog. |
| **Stock Check Item** | One row per material inside a Stock Check: `material_id` + `current_stock` (in **purchase units**, integer). Also **snapshots** the material's name, price, purchase unit, purchase unit size, minimum stock, and normal stock at the time the check is created — so the derived purchase list remains stable over time even if the manager later edits the material. |
| **Purchase List** | A **computed, non-persisted** view derived from a **specific** Stock Check (via the snapshotted fields on its items). Tells the crew what to buy and how much. Surfaced as a per-row action on the Stock Check list — there is no separate "opening" route. |

Material itself is extended with four new fields (see FR-1) that configure the **next** Stock Check.

> **Unit conventions.** The three stock-policy values (`minimum_stock`, `normal_stock`, `current_stock`) are expressed in **purchase units** and are **integers**. Rationale: the staff is instructed to remove only whole containers from the storeroom (no opened/partially-used bags counted), and managers configure policy in the same units they buy in ("min 2 sacks, normal 5 sacks"). The recipe/variant module is unaffected: it continues to consume materials in recipe units, and `price` continues to be price-per-recipe-unit. `purchase_unit_size` (float) is what bridges the two when we compute the estimated cost.

### Core Rule (Purchase Calculation)

For each `StockCheckItem` in a Stock Check, reading the snapshotted fields on that item:

```
if current_stock <= minimum_stock AND normal_stock > minimum_stock:
    purchase_quantity = normal_stock - current_stock          // integer, purchase units
    estimated_cost    = purchase_quantity * purchase_unit_size * price
```

Items whose `current_stock > minimum_stock` are **not** included in the purchase list. Items whose policy is unconfigured (`normal_stock <= minimum_stock`) are also excluded — they're silently ignored until a manager sets a real policy on the material.

---

## Feature Requirements

### FR-1: Extend Material with purchase + stock-policy fields

Add the following fields to `Material`:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `purchase_unit` | string | yes | Human-readable purchase unit, e.g. `"Kg"`, `"Box"`, `"Bottle"`. Displayed everywhere stock is shown. |
| `purchase_unit_size` | float | yes | How many **recipe units** are inside one purchase unit. E.g. if `unit = "Gram"` and `purchase_unit = "Kg"`, then `purchase_unit_size = 1000`. Used only to convert a purchase-unit shortage into recipe units for the estimated-cost calculation. Must be > 0. |
| `minimum_stock` | int | yes | Threshold in **whole purchase units**. If current stock falls at or below this, the material must be restocked. Must be ≥ 0. |
| `normal_stock` | int | yes | Target stock level in **whole purchase units** to reach after restocking. Must be `> minimum_stock` for the material to appear on any purchase list. |

**Rules:**
- Existing materials are backfilled with sensible defaults during migration so the API does not break (`purchase_unit = unit`, `purchase_unit_size = 1`, `minimum_stock = 0`, `normal_stock = 0`). They will be excluded from purchase lists until a manager edits them — this is intentional, not an error state.
- Validation: `purchase_unit_size > 0`, `minimum_stock ≥ 0`, `normal_stock > minimum_stock` is **not** enforced at the material level (we allow `normal_stock = minimum_stock = 0` to mean "policy not configured yet"). The purchase-list calculation simply excludes such materials.
- `price` keeps its existing semantic ("price per recipe unit") — it is **not** renamed, to avoid breaking the variant/recipe module.

### FR-2: Stock Check management

The system shall let any logged-in user create, view, edit, and soft-delete Stock Checks.

**A Stock Check consists of:**
- `id`
- `note` (optional free text — e.g. "weekend, dry storage only").
- `created_at`, `created_by` (user id), `deleted_at`.
- A list of **Stock Check Items** — one per non-deleted material at the moment the check was created.

**A Stock Check Item consists of:**
- `id`, `stock_check_id`, `material_id`
- `current_stock` (int, ≥ 0, purchase units)
- **Snapshotted material fields** (frozen at item creation time, dedicated columns each):
  - `material_name` (string)
  - `price` (float, per recipe unit)
  - `purchase_unit` (string)
  - `purchase_unit_size` (float)
  - `minimum_stock` (int)
  - `normal_stock` (int)

**Rules:**
- On `POST /stock-checks`, the backend reads the current `materials` table and emits one Stock Check Item per non-deleted material, populating both `current_stock` (from the request body, defaulting to `0` if the client omits a given material) and the six snapshot fields (from the live material row). Items are saved in a single operation using GORM's `FullSaveAssociations` mode.
- The create screen pre-loads **all non-deleted materials** with each input defaulting to `0`, and shows each material's `purchase_unit` as the input suffix (e.g. *"Tepung … `___ Kg`"*). The crew adjusts only the rows where they actually counted something. There is no "not counted" concept — every material gets an item, with `0` meaning "all gone".
- Editing a Stock Check (`PUT`) updates `current_stock` values on the existing items only. The snapshot fields are **not** refreshed on edit — they remain frozen at `created_at` time, which is the whole point of the snapshot. Updates also use `FullSaveAssociations` mode.
- Soft delete is supported. Deleted Stock Checks are excluded from the default list view but accessible to admin-style endpoints if needed later.

### FR-3: Purchase List (per Stock Check)

The system shall expose `GET /stock-checks/{id}/purchase-list` that computes the purchase list for one specific Stock Check from its snapshotted items.

**Response payload per row** (all stock values in purchase units, all snapshot-derived):
- `material_id`, `material_name`
- `current_stock`, `minimum_stock`, `normal_stock`
- `purchase_unit`, `purchase_unit_size`
- `purchase_quantity` (= `normal_stock - current_stock`, integer)
- `estimated_cost` (= `purchase_quantity * purchase_unit_size * price`)

**Top-level metadata:**
- `stock_check_id`, `stock_check_created_at`
- `total_estimated_cost`

**Rules:**
- Only items where `current_stock <= minimum_stock` AND `normal_stock > minimum_stock` are returned. All other items are silently excluded.
- The endpoint is computed on demand — no `purchase_lists` table exists. The snapshot lives on the Stock Check Items, which is enough.
- Because everything is computed from snapshots, the same Stock Check returns the same purchase list forever, regardless of subsequent edits to the underlying Material rows.
- Printing is **out of scope** for this PRD; the screen will render the list cleanly so an export action can be layered on later.

### FR-4: Navigation & Discoverability

- One main-nav entry: **"Stock Check"**.
- Clicking it opens the Stock Check list (paginated, sorted by `created_at` desc).
- Each row has a triple-dot menu: **View Details**, **Edit**, **View Purchase List**, **Print Purchase List** (disabled — future scope), **Delete**.
- A "Create Stock Check" button is the primary CTA on the list page.

---

## Out of Scope

- Printing / PDF export of the purchase list.
- Marking purchase-list rows as "bought" or auto-deducting purchases from on-hand stock.
- Multi-warehouse / multi-location stock.
- Automatic stock deduction from sales transactions (the `variant_material` linkage already exists but is not used here).
- Supplier assignment per material on the purchase list.
- Forecasting / smart reorder points beyond the simple `min → normal` rule.
- Mobile-app-specific UX polish beyond what Tamagui shared screens give for free.
- Tracking partially-used containers — staff are instructed to take whole containers only, so the count is always an integer count of whole containers in the storeroom.

---

## Open Questions

1. If a material is added to the catalog *after* a Stock Check was created, the old Stock Check will not have a row for it. **Confirmed expected** — Stock Check items snapshot the catalog at creation time; this is the desired historical behaviour.

---

# Implementation Plan — Phased PRs

Each phase below is sized to land as **one reviewable PR**. Phases are ordered so that every PR keeps `main` green: the API stays backward-compatible after each merge, and no UI ships without its supporting endpoint.

The plan is **four PRs**: Material extension; Stock Check API (including the per-stock-check purchase-list endpoint); Stock Check UI (list, create, edit); Purchase List screen reached via the triple-dot menu.

---

### Phase 1 — Extend Material with purchase & stock-policy fields

**Goal:** Ship FR-1 end-to-end so the catalog can hold the data the rest of the feature depends on.

**Backend**
- Migration `000008_extend_materials_inventory.up.sql` / `.down.sql`:
  - Add nullable columns `purchase_unit VARCHAR(64)`, `purchase_unit_size FLOAT`, `minimum_stock INT`, `normal_stock INT`.
  - Backfill existing rows: `purchase_unit = unit`, `purchase_unit_size = 1`, `minimum_stock = 0`, `normal_stock = 0`.
  - `ALTER` columns to `NOT NULL DEFAULT 0` (and `''` for `purchase_unit`) after backfill.
- Update `apps/api/domain/material_entity.go`, `apps/api/data/mysql/material_*`, handler, transformer to include the new fields.
- Add validation in the create/update handlers: `purchase_unit_size > 0`, `minimum_stock >= 0`, `normal_stock >= 0`.
- Update `libs/api-contract/src/api.yaml` for the four new fields on the Material schema and on create/update requests. Regenerate Go + TS clients.
- Update existing material seeds (`apps/api/seeds/`) so test data has realistic values.

**Frontend**
- Extend the `Material` entity, repository, and Zod schema in `libs/ui/src/domain/...`.
- Add the four fields to the Material create/update form (`MaterialCreateScreen`, `MaterialUpdateScreen`) with inline help (e.g. *"Purchase unit size: how many recipe units in 1 purchase unit"*). Render `minimum_stock` and `normal_stock` as integer-only inputs.
- Add `Purchase Unit`, `Min Stock`, `Normal Stock` columns to the material list table (collapsible/secondary on mobile to avoid clutter).

**Acceptance**
- Existing materials still load and edit correctly with defaulted values.
- A non-integer value submitted for `minimum_stock` or `normal_stock` is rejected by the form and by the API.
- Generated TS hooks reflect the new fields.

**Estimated diff size:** ~600–900 LoC. Self-contained.

---

### Phase 2 — Stock Check API (FR-2 + FR-3 backend)

**Goal:** Stand up the full backend surface — persistence, CRUD, and the on-demand purchase-list computation — with no UI yet. Folding the purchase-list endpoint into this PR keeps it small (it's just one extra handler on the same resource and shares the same fixtures) and removes the need for a follow-up backend PR.

**Backend**
- Migration `000009_create_stock_checks.up.sql` / `.down.sql`:
  - `stock_checks (id, note TEXT NULL, created_by BIGINT, created_at, deleted_at)`.
  - `stock_check_items (id, stock_check_id, material_id, current_stock INT NOT NULL, material_name VARCHAR(255), price FLOAT, purchase_unit VARCHAR(64), purchase_unit_size FLOAT, minimum_stock INT, normal_stock INT, created_at)` with FK to `materials` and `stock_checks` (ON DELETE CASCADE for items when the check is hard-deleted).
- Domain layer: `StockCheck`, `StockCheckItem`, `PurchaseList`, `PurchaseListItem` entities; repository interface; usecases for `List`, `GetById`, `Create`, `Update`, `SoftDelete`, `GetPurchaseList`. The `stockCheckRepository` variable name is used consistently throughout the usecase layer.
- `Create` usecase: read all non-deleted materials, emit one `StockCheckItem` per material (using request body for `current_stock`, defaulting to `0` when absent; reading live material fields for the six snapshot columns). Persist via GORM `FullSaveAssociations` — no manual item insertion loop.
- `GetPurchaseList` usecase: load the Stock Check and its items, filter by the rule in FR-3, compute `purchase_quantity` and `estimated_cost` per row, sum `total_estimated_cost`.
- Data layer: GORM structs + repository implementation.
- Presentation layer: handlers + transformers + routes:
  - `GET /stock-checks` (paginated)
  - `GET /stock-checks/{id}`
  - `POST /stock-checks` (accepts `note` and `items: [{material_id, current_stock}]`)
  - `PUT /stock-checks/{id}` (updates `current_stock` on existing items only; snapshot fields untouched)
  - `DELETE /stock-checks/{id}` (soft delete)
  - `GET /stock-checks/{id}/purchase-list`
- OpenAPI spec update + regenerate clients.
- Backend unit + handler tests mirroring the `material_*_test.go` pattern.

**Acceptance**
- A new Stock Check has one item per non-deleted material, even for materials the client didn't include in the request body (their `current_stock` defaults to `0`).
- Editing a Material's price/min/normal **after** a Stock Check exists does **not** change that Stock Check's purchase-list output.
- For a fixture Stock Check where `tepung` was counted at `current_stock = 0`, with `minimum_stock = 1`, `normal_stock = 5`, `purchase_unit = "Kg"`, `purchase_unit_size = 1000`, `price = 15`, `GET /stock-checks/{id}/purchase-list` returns `purchase_quantity = 5` and `estimated_cost = 5 * 1000 * 15 = 75000`.
- An item with `minimum_stock = normal_stock = 0` is excluded (policy unconfigured).

**Estimated diff size:** ~1000–1300 LoC, almost all new files. Slightly above the earlier Phase 2 budget because the purchase-list endpoint comes with it, but still reviewable since it's one cohesive resource.

---

### Phase 3 — Stock Check frontend (list + create/edit)

**Goal:** Ship the screens that the closing crew uses to record nightly counts.

**Frontend only**
- `libs/ui/src/domain/...`: `StockCheck`, `StockCheckItem` entities, repository, usecases (`stockCheckCreate`, `stockCheckList`, `stockCheckUpdate`, `stockCheckDelete`).
- Screens:
  - **StockCheckListScreen / Handler**: paginated table — `created_at` (displayed as date), item count, created-by; each row has a triple-dot menu (View / Edit / View Purchase List / Print (disabled) / Delete). Primary CTA: "Create Stock Check".
  - **StockCheckCreateScreen / Handler**: header has a note input; body is a virtualized list of all non-deleted materials with an integer input per row for `current_stock` (defaulted to `0`), with the material's `purchase_unit` rendered as the input suffix. Submit posts to `POST /stock-checks`.
  - **StockCheckUpdateScreen / Handler**: same form as create but pre-filled from the existing items. Only `current_stock` is editable.
- Web pages: `apps/web/src/pages/stock-checks/{index.tsx, create.tsx, [id].tsx, [id]/edit.tsx}`.
- Nav entry: a single "Stock Check" item in the main nav.
- React Query: invalidate the stock-check list cache on successful create/update/delete.

**Acceptance**
- Manual smoke: create a Stock Check from the web app (with most rows left at `0`), see it in the list, edit one row's count, soft-delete it.
- Non-integer values in the count input are rejected client-side.

**Estimated diff size:** ~700–1000 LoC.

---

### Phase 4 — Purchase List screen (FR-3 frontend)

**Goal:** Ship FR-3's screen, reached from the Stock Check list's triple-dot menu, and close out the user-facing feature.

**Frontend only**
- `libs/ui/src/domain/...`: `PurchaseList`, `PurchaseListItem` entities, repository, usecase (`purchaseListGet` keyed by `stockCheckId`).
- **PurchaseListScreen / Handler**:
  - Header: `"Purchase list for closing count of {created_at date}"` plus `total_estimated_cost`.
  - Main table: material name, `current_stock`, `minimum_stock`, `normal_stock`, `purchase_quantity` + `purchase_unit`, `estimated_cost`.
  - Empty state (when no items meet the threshold): "Nothing to restock — everything is above its minimum."
  - "Print" button rendered but disabled with a tooltip — explicitly future scope.
- Web page: `apps/web/src/pages/stock-checks/[id]/purchase-list.tsx`. Mobile screen wired through the shared handler.
- Wire the **View Purchase List** triple-dot action from the Stock Check list (added in Phase 3) to navigate here.
- E2E smoke test (Playwright, web only): create a Stock Check with several materials at `0`, open its Purchase List, assert expected rows and total.

**Acceptance**
- Manual smoke: full happy path (configure material with min/normal/purchase fields → create Stock Check leaving most rows at `0` → open Purchase List via triple-dot → verify correct quantities and cost).
- Subsequent edits to a Material's `price`/`minimum_stock`/`normal_stock` do not change an already-created Stock Check's Purchase List (snapshot is honoured end-to-end).

**Estimated diff size:** ~500–700 LoC.

---

## Rollout Order Summary

| Phase | Layer | Depends on | Ship-without-UI-safe? |
|---|---|---|---|
| 1 | Material extension (full-stack) | — | Yes (additive) |
| 2 | Stock Check API + Purchase List API | 1 | Yes (no UI yet) |
| 3 | Stock Check UI (list + create + edit) | 2 | — |
| 4 | Purchase List UI (per-row) | 2, 3 | — |

After Phase 3 the cafe can already start recording closing counts (gathering data) before the morning view ships. After Phase 4, the feature is complete per this PRD.
