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
| **Stock Check** | A dated snapshot, recorded by the closing crew, of how much of each material is currently in the storeroom. Equivalent to "Closing Stock Count for 2026-05-15". |
| **Stock Check Item** | A row inside a Stock Check: `material_id` + `current_stock` (in **purchase units**, e.g. "1.5 sacks"). One row per material counted. |
| **Purchase List** | A **computed, non-persisted** view derived from the most recent Stock Check + each material's `minimum_stock` / `normal_stock` / `purchase_unit_size`. Tells the opening crew what to buy and how much. |

Material itself is extended with four new fields (see FR-1).

> **Unit convention.** All three stock-policy values (`minimum_stock`, `normal_stock`, `current_stock`) are expressed in **purchase units**, not recipe units. Rationale: when the closing crew physically counts the storeroom they see "3 sacks, 1.5 boxes", not "3000 grams, 1500 mL" — counting and configuring in purchase units removes a mental conversion and lets policy ("min 2 sacks") read directly against the count. The recipe/variant module is unaffected: it continues to consume materials in recipe units, and `price` continues to be price-per-recipe-unit. `purchase_unit_size` is what bridges the two when we need an estimated cost.

### Core Rule (Purchase Calculation)

For each material `m` in the latest Stock Check (all stock values in purchase units):

```
if current_stock <= minimum_stock:
    needed_purchase_units = ceil(normal_stock - current_stock)
    needed_recipe_units   = needed_purchase_units * purchase_unit_size
    estimated_cost        = needed_recipe_units * price
```

Materials whose `current_stock > minimum_stock` are **not** included in the purchase list. Materials missing from the latest Stock Check are surfaced separately as "not counted" so the crew can decide whether to skip or count now.

---

## Feature Requirements

### FR-1: Extend Material with purchase + stock-policy fields

Add the following fields to `Material`:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `purchase_unit` | string | yes | Human-readable purchase unit, e.g. `"Kg"`, `"Box"`, `"Bottle"`. Displayed everywhere stock is shown. |
| `purchase_unit_size` | float | yes | How many **recipe units** are inside one purchase unit. E.g. if `unit = "Gram"` and `purchase_unit = "Kg"`, then `purchase_unit_size = 1000`. Used only to convert a purchase-unit shortage into recipe units for the estimated-cost calculation. Must be > 0. |
| `minimum_stock` | float | yes | Threshold in **purchase units**. If current stock falls at or below this, the material must be restocked. Must be ≥ 0. |
| `normal_stock` | float | yes | Target stock level in **purchase units** to reach after restocking. Must be `> minimum_stock`. |

**Rules:**
- Existing materials must be backfilled with sensible defaults during migration so the API does not break (`purchase_unit = unit`, `purchase_unit_size = 1`, `minimum_stock = 0`, `normal_stock = 0`). They will be excluded from the purchase list until a manager edits them.
- Validation: `purchase_unit_size > 0`, `normal_stock > minimum_stock`, `minimum_stock ≥ 0`.
- `price` keeps its existing semantic ("price per recipe unit") — it is **not** renamed, to avoid breaking the variant/recipe module.

### FR-2: Stock Check management

The system shall let any logged-in user create a Stock Check, and list/view past Stock Checks.

**A Stock Check consists of:**
- `id`
- `check_date` (date, required, defaults to today). Stored as a date, not a timestamp.
- `note` (optional free text — e.g. "weekend, dry storage only").
- `created_at`, `created_by` (user id), `deleted_at`.
- A list of **Stock Check Items**, each with `material_id` + `current_stock` (in **purchase units**, `≥ 0`). Fractional values are allowed (e.g. `1.5` for a half-empty second sack).

**Rules:**
- One Stock Check per `check_date` (uniqueness on `check_date`, soft-deleted rows excluded). If the crew needs to correct a count, they edit the existing Stock Check rather than creating a duplicate.
- The create screen pre-loads **all non-deleted materials**, shows each material's `purchase_unit` next to its input as a label (e.g. *"Tepung … ___ Kg"*), and lets the crew enter a purchase-unit value for each. Materials without a value are simply not stored as items (treated as "not counted").
- Stock Check Items snapshot the `material_id` only; they do not snapshot price/min/normal — those are read live when the purchase list is computed. Rationale: the purchase list is meant to be acted on the next morning, before policies drift.
- Soft delete is supported. A deleted Stock Check is hidden from the "latest" lookup used by the purchase list.

### FR-3: Purchase List (opening view)

The system shall expose a single endpoint and screen that returns the **purchase list for today**, computed from the **most recent non-deleted Stock Check**.

**Response payload per row** (all stock values in purchase units):
- `material_id`, `material_name`
- `current_stock`, `minimum_stock`, `normal_stock`
- `purchase_unit`, `purchase_unit_size`
- `purchase_quantity` — whole purchase units to buy (= `ceil(normal_stock - current_stock)`)
- `estimated_cost` (= `purchase_quantity * purchase_unit_size * price`)

**Top-level metadata:**
- `stock_check_id`, `stock_check_date` (which snapshot this was computed from)
- `total_estimated_cost`
- `not_counted_materials`: list of `{material_id, material_name}` for materials that exist in the catalog but were not in the latest Stock Check. The UI surfaces these separately as a warning.

**Rules:**
- Only materials with `current_stock <= minimum_stock` AND `normal_stock > minimum_stock` (i.e. policy has been configured) are returned in the main list.
- If there is no Stock Check yet, the endpoint returns an empty list with a flag the UI can render ("No closing count recorded — please do a stock check first").
- Printing is **out of scope** for this PRD. The screen will simply render the list cleanly; a print/export action can be layered on later.

### FR-4: Navigation & Discoverability

- Add an "Inventory" entry to the main nav with two sub-routes:
  - **Closing → Record Stock** (FR-2 create flow)
  - **Opening → Purchase List** (FR-3 view)
- A "Stock Check History" list is available from the same nav so managers can audit past counts.

---

## Out of Scope

- Printing / PDF export of the purchase list.
- Marking purchase-list rows as "bought" or auto-deducting purchases from on-hand stock.
- Multi-warehouse / multi-location stock.
- Automatic stock deduction from sales transactions (the `variant_material` linkage already exists but is not used here).
- Supplier assignment per material on the purchase list.
- Forecasting / smart reorder points beyond the simple `min → normal` rule.
- Mobile-app-specific UX polish beyond what Tamagui shared screens give for free.

---

## Open Questions

1. Should `purchase_unit_size` allow non-integer values (e.g. a 750 mL bottle)? **Assumed yes** in this PRD (float).
2. Should the purchase list round `purchase_quantity` up to whole purchase units, or allow fractional? **Assumed up to whole units** (ceil), since you can't buy half a sack — even though `current_stock` itself accepts fractional purchase units to reflect partially-used containers.
3. If two Stock Checks exist for the same date (one soft-deleted), is the live one always "latest"? **Yes** — soft-deleted rows are excluded from the latest lookup.

---

# Implementation Plan — Phased PRs

Each phase below is sized to land as **one reviewable PR**. Phases are ordered so that every PR keeps `main` green: the API stays backward-compatible after each merge, and no UI ships without its supporting endpoint.

---

### Phase 1 — Extend Material with purchase & stock-policy fields

**Goal:** Ship FR-1 end-to-end so the catalog can hold the data the rest of the feature depends on.

**Backend**
- Migration `000008_extend_materials_inventory.up.sql` / `.down.sql`:
  - Add nullable columns `purchase_unit VARCHAR(64)`, `purchase_unit_size FLOAT`, `minimum_stock FLOAT`, `normal_stock FLOAT`.
  - Backfill existing rows: `purchase_unit = unit`, `purchase_unit_size = 1`, `minimum_stock = 0`, `normal_stock = 0`.
  - `ALTER` columns to `NOT NULL DEFAULT 0` (and `''` for `purchase_unit`) after backfill.
- Update `apps/api/domain/material_entity.go`, `apps/api/data/mysql/material_*`, handler, transformer to include the new fields.
- Add validation in the create/update handlers: `purchase_unit_size > 0`, `minimum_stock >= 0`, `normal_stock > minimum_stock`.
- Update `libs/api-contract/src/api.yaml` for the four new fields on the Material schema and on create/update requests. Regenerate Go + TS clients.
- Update existing material seeds (`apps/api/seeds/`) so test data has realistic values.

**Frontend**
- Extend the `Material` entity, repository, and Zod schema in `libs/ui/src/domain/...`.
- Add the four fields to the Material create/update form (`MaterialCreateScreen`, `MaterialUpdateScreen`) with inline help (e.g. *"Purchase unit size: how many recipe units in 1 purchase unit"*).
- Add `Purchase Unit`, `Min Stock`, `Normal Stock` columns to the material list table (collapsible/secondary on mobile to avoid clutter).

**Acceptance**
- Existing materials still load and edit correctly with defaulted values.
- Creating a material with `normal_stock <= minimum_stock` returns a 400.
- Generated TS hooks reflect the new fields.

**Estimated diff size:** ~600–900 LoC. Self-contained.

---

### Phase 2 — Stock Check backend (FR-2 API)

**Goal:** Stand up the persistence + REST surface for Stock Checks, with no UI yet.

**Backend**
- Migration `000009_create_stock_checks.up.sql` / `.down.sql`:
  - `stock_checks (id, check_date DATE NOT NULL, note TEXT NULL, created_by BIGINT, created_at, deleted_at)` with a unique partial index on `check_date` where `deleted_at IS NULL`.
  - `stock_check_items (id, stock_check_id, material_id, current_stock FLOAT NOT NULL, created_at)` with FK to `materials` and `stock_checks` (ON DELETE CASCADE for items when the check is hard-deleted).
- Domain layer: `StockCheck`, `StockCheckItem` entities; repository interface; usecases for `List`, `GetById`, `GetLatest`, `Create`, `Update`, `SoftDelete`.
- Data layer: GORM structs + repository implementation.
- Presentation layer: handlers + transformers + routes:
  - `GET /stock-checks` (paginated)
  - `GET /stock-checks/latest`
  - `GET /stock-checks/{id}`
  - `POST /stock-checks` (accepts `check_date`, `note`, and `items: [{material_id, current_stock}]`)
  - `PUT /stock-checks/{id}` (replace items)
  - `DELETE /stock-checks/{id}` (soft delete)
- OpenAPI spec update + regenerate clients.
- Backend unit + handler tests mirroring the `material_*_test.go` pattern.

**Acceptance**
- `POST /stock-checks` with a duplicate `check_date` returns 409.
- `GET /stock-checks/latest` returns the most recent non-deleted check, or 404 when none exist.

**Estimated diff size:** ~800–1100 LoC, almost all new files.

---

### Phase 3 — Stock Check frontend (closing-night flow)

**Goal:** Ship the screens the closing crew will actually use.

**Frontend only**
- `libs/ui/src/domain/...`: `StockCheck` entity, repository, usecases (`stockCheckCreate`, `stockCheckList`, `stockCheckUpdate`).
- Screens (mirror Material screens):
  - **StockCheckCreateScreen / Handler**: header has date picker (defaults to today) + note; body is a virtualized list of all non-deleted materials with a numeric input per row for `current_stock`, with the material's `purchase_unit` rendered as the input suffix (e.g. *"Tepung … ___ Kg"*). Submit posts to `POST /stock-checks`. Empty inputs are omitted (treated as "not counted").
  - **StockCheckListScreen**: paginated table — date, item count, created-by; row click → detail.
  - **StockCheckUpdateScreen**: same form as create but pre-filled.
- Web pages: `apps/web/src/pages/stock-checks/{index.tsx, create.tsx, [id].tsx}`.
- Nav entry: "Inventory → Record Stock" (closing) and "Inventory → Stock Check History".
- Optimistic UI: invalidate `stock-checks/latest` cache on successful create/update so Phase 5 sees fresh data immediately.

**Acceptance**
- Manual smoke: create a stock check from the web app, see it in the history list, edit it, soft-delete it.

**Estimated diff size:** ~700–1000 LoC.

---

### Phase 4 — Purchase List backend (FR-3 API)

**Goal:** Add the single computed endpoint that the morning screen will consume.

**Backend**
- New domain object `PurchaseList` (in-memory only — no migration).
- New usecase `PurchaseListGet` that:
  1. Loads the latest non-deleted Stock Check (and its items).
  2. Loads all non-deleted Materials.
  3. Computes the per-row payload defined in FR-3, plus `not_counted_materials`.
- New endpoint `GET /purchase-list` (optional query `?stock_check_id=...` so a manager can view the list as of an older check; defaults to latest).
- OpenAPI spec update + regenerate clients.
- Unit tests covering: empty-state (no stock check), all-above-minimum (empty list), partial counting (not-counted surfaced), `ceil()` rounding of `purchase_quantity`, materials with unconfigured policy (`normal_stock == 0`) excluded.

**Acceptance**
- For a fixture stock check where `tepung` was counted at `current_stock = 0.5` (Kg-sacks), with `minimum_stock = 1`, `normal_stock = 5`, `purchase_unit = "Kg"`, `purchase_unit_size = 1000` (grams per Kg), `price = 15` (per gram), the endpoint returns `purchase_quantity = 5` and `estimated_cost = 5 * 1000 * 15 = 75000`.
- A material with `current_stock = 1.2`, `minimum_stock = 1` is excluded from the list (above minimum).

**Estimated diff size:** ~400–600 LoC.

---

### Phase 5 — Purchase List frontend (opening flow)

**Goal:** Ship FR-3's screen and close out the user-facing feature.

**Frontend only**
- `libs/ui/src/domain/...`: `PurchaseList` entity, repository, usecase.
- **PurchaseListScreen / Handler**:
  - Header shows which stock check it was computed from (`"Based on closing count for 2026-05-14"`) and total estimated cost.
  - Main table: material name, current / min / normal, purchase qty + unit, estimated cost.
  - Secondary section: "Not counted last night" with a CTA back to Record Stock.
  - Empty state: "No closing count recorded yet — record stock first."
- Web page: `apps/web/src/pages/inventory/purchase-list.tsx`. Mobile screen wired through the shared handler.
- Nav entry: "Inventory → Purchase List" (opening).
- E2E smoke test (Playwright, web only) covering: create stock check with low stock → open purchase list → assert expected rows.

**Acceptance**
- Manual smoke: full happy path (configure material with min/normal/purchase fields → record closing stock under the minimum → next session, open Purchase List → verify correct quantities and cost).

**Estimated diff size:** ~500–800 LoC.

---

## Rollout Order Summary

| Phase | Layer | Depends on | Ship-without-UI-safe? |
|---|---|---|---|
| 1 | Material extension (full-stack) | — | Yes (additive) |
| 2 | Stock Check API | 1 | Yes (no UI yet) |
| 3 | Stock Check UI | 2 | — |
| 4 | Purchase List API | 1, 2 | Yes |
| 5 | Purchase List UI | 4 | — |

After Phase 3 the cafe can already start recording closing counts (gathering data) before the morning view ships. After Phase 5, the feature is complete per this PRD.
