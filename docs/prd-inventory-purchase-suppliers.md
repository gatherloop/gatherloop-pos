# PRD: Connect Suppliers to Materials & Actionable Purchase List

## Problem Statement

The inventory team uses the auto-generated **Purchase List** (`/stock-checks/{id}/purchase-list`, defined in `prd-inventory-management.md`) to know **what** to restock at the start of each day. But the list tells them nothing about **where** or **how** to buy each material:

1. They have to open a second tab to look up each supplier's address, phone number, or online store.
2. There's no way to filter the list by purchase channel — e.g. "show me everything I can order online before I leave for the morning supplier run."
3. A material that is currently bought from two suppliers (one cheaper offline, one faster via delivery) has no record of either; the institutional knowledge lives in WhatsApp chats and crew memory.

The **Supplier** feature already exists (CRUD over `suppliers` table — name, address, phone, maps_link) but is **completely disconnected** from `materials`. There is no `material_suppliers` table, no foreign key, no UI to link them.

This PRD closes that gap.

---

## Context: Existing System

- **Backend**: Go REST API + MySQL, Clean Architecture. Migrations under `apps/api/migrations/`.
- **Frontend**: Next.js web + React Native mobile sharing `libs/ui` (Tamagui). Data fetched through generated React Query hooks from `libs/api-contract` (Kubb-generated from `libs/api-contract/src/api.yaml`).
- **Material entity** (`apps/api/domain/material_entity.go`) already extended by the inventory-management PRD with `purchase_unit`, `purchase_unit_size`, `minimum_stock`, `normal_stock`. No supplier reference today.
- **Supplier entity** (`apps/api/domain/supplier_entity.go`): `Id`, `Name`, `Phone` (optional), `Address`, `MapsLink`, soft-delete timestamps.
- **Purchase List** is **computed, non-persisted** (per the inventory-management PRD) — `GET /stock-checks/{id}/purchase-list` returns `PurchaseListItem[]`, each carrying `material_id`, `material_name`, stock policy snapshot, `purchase_quantity`, `estimated_cost`. Code: `apps/api/domain/stock_check_entity.go`, handler `apps/api/presentation/restapi/stock_check_handler.go`, frontend in `libs/ui/src/presentation/components/purchaseLists/`.
- **Proven many-to-many pattern** in the codebase: `variant_materials` (junction loaded with GORM `Preload`, diff/upsert on save). See `apps/api/data/mysql/variant_repo.go` and `apps/api/domain/variant_entity.go`. The new junction will follow this template exactly.

---

## Proposed Solution

Introduce a junction `material_suppliers` that records, for each (material, supplier) pair, **how** that supplier can fulfill that material:

| Purchase type | What it means | Data needed |
|---|---|---|
| `offline` | Crew goes to the supplier's store and buys it in person | Re-uses `suppliers.address` and `suppliers.maps_link` — nothing extra on the junction |
| `online` | Crew opens a URL and places an order on the supplier's web shop | Requires a per-material `purchase_url` on the junction |
| `delivery` | Crew contacts the supplier admin who delivers to the cafe | Re-uses `suppliers.phone` — nothing extra on the junction |

A supplier can provide multiple materials. A material can be linked to multiple suppliers — and even to the **same** supplier under multiple purchase types (e.g. you can normally walk in, but during heavy weeks you call them for delivery).

### Confirmed Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Purchase list layout | **Grouped by supplier** (one section per supplier) | Lets staff knock out one supplier at a time on the morning run. |
| Filter semantics | A material appears under a purchase-type filter if **any** of its linked suppliers offers that type. | Matches mental model ("which materials *can* I buy online?") without forcing a single canonical supplier per material. |
| Pricing | **Stays on `materials.price`**. No per-supplier price in this iteration. | Keeps the inventory-management PRD's estimated-cost formula untouched. Per-supplier pricing is deferred. |
| Row actions | `online` → external link (`target=_blank`). `offline` → maps link. `delivery` → `tel:` link + WhatsApp deep link. | Lets the crew act on the list without leaving the screen. |
| "Chosen supplier" per purchase line | **Not persisted in this iteration.** A material with N suppliers appears in N supplier sections; the staff picks one mentally. | Keeps scope small. A future iteration can record the choice for analytics. |

### Core Rules

1. `material_suppliers.purchase_url` is **required iff** `purchase_type = 'online'`, and **must be empty** otherwise. Enforced both at the API validator and at the React Hook Form layer.
2. Soft-deleted suppliers (`suppliers.deleted_at IS NOT NULL`) **must not** appear in any purchase-list row. The junction joins are filtered accordingly.
3. Deleting a supplier soft-deletes its `material_suppliers` rows too (handled in the supplier delete usecase).
4. Materials with **zero** active supplier links still appear in the purchase list — in an "Unassigned" section with a CTA linking to the material edit page. This is intentional: we don't want a missing link to hide a needed purchase.

---

## Feature Requirements

### FR-1: `material_suppliers` junction table

A new table linking materials to suppliers, with the purchase channel and (for online) the per-material purchase URL.

```sql
CREATE TABLE material_suppliers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  material_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  purchase_type ENUM('online','offline','delivery') NOT NULL,
  purchase_url VARCHAR(2048) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  INDEX idx_material (material_id),
  INDEX idx_supplier (supplier_id),
  UNIQUE KEY uq_material_supplier_type (material_id, supplier_id, purchase_type, deleted_at)
);
```

**Rules:**
- The unique key includes `deleted_at` so a soft-deleted row doesn't block re-adding the same combination.
- No FK constraints in MySQL (matches the repo's existing convention — referential integrity enforced in the usecase layer, see `variant_repo.go`).
- `purchase_url` stores an empty string `''` when not applicable (no NULL). When non-empty it must be a valid `http(s)://` URL; max 2048 chars. Using an empty string avoids pointer types in Go and simplifies validation logic.

### FR-2: Manage a material's suppliers from the Material detail page

The Material update screen gains a **"Suppliers"** section underneath the existing form. Inventory staff can:

- Add a row → supplier picker (searches existing suppliers) + purchase-type radio (`Online | Offline | Delivery`).
- For `Online`: show a `purchase_url` text input (required, URL-validated).
- For `Offline`: show a read-only preview of the selected supplier's `address` + `maps_link`.
- For `Delivery`: show a read-only preview of the selected supplier's `phone`. If the selected supplier has no phone, the row is invalid and the form blocks submit with a clear error.
- Remove a row (soft-deletes on save).
- The whole list is saved together with the material in the **same form submission**: `POST /materials` on create, `PUT /materials/{id}` on update. The `suppliers` array is included in the same request body and uses replace semantics — the full desired list must be sent on every save.

Read-only summary of linked suppliers should also be visible on the Material **detail** page (`apps/web/src/pages/materials/[materialId].tsx`) so the manager can see linkage without entering edit mode.

### FR-3: Purchase List grouped by supplier with actionable rows

The Purchase List screen (`PurchaseListScreen.tsx` and its components in `libs/ui/src/presentation/components/purchaseLists/`) changes from a flat table to a grouped view:

- One section per supplier, sorted alphabetically. Section header shows supplier name + a subtotal of estimated cost for that section.
- An "Unassigned" section at the bottom for materials with zero active supplier links. Each row has a "Link a supplier →" CTA opening the material edit page in a new tab.
- A material with N active supplier links renders in N sections. Each row shows: material name, `purchase_quantity` + `purchase_unit`, `estimated_cost`, and a single **action button** chosen by the row's `purchase_type`:
  - `online` → `Open store` button → `purchase_url` in a new tab (`rel="noopener noreferrer"`).
  - `offline` → `Open map` button → `supplier.maps_link` in a new tab; falls back to a Google Maps search of `supplier.address` if `maps_link` is empty.
  - `delivery` → two buttons: `Call` (`tel:<digits>`) and `WhatsApp` (`https://wa.me/<digits>`, digits-only phone).
- The total estimated cost at the top of the screen stays unchanged: it sums each **material** once, regardless of how many supplier sections it appears in.

### FR-4: Filter Purchase List by purchase type

Above the grouped list, a segmented control: **All | Online | Offline | Delivery**.

- "All" (default) shows everything.
- Picking a type filters in two passes: a material is visible if **any** of its linked suppliers has that type; within each visible material, only the rows whose `purchase_type` matches are rendered.
- The "Unassigned" section is hidden when any non-"All" filter is active (it has no purchase type).
- Selected filter is persisted in the URL query string (`?purchaseType=online`) so a refresh or shared link preserves the view.
- Empty result → friendly empty state ("No materials need to be purchased via *<type>* right now").

### FR-5: API contract changes

- Extend `Material` response schema with `suppliers: MaterialSupplier[]` (always present, possibly empty).
- New `MaterialSupplier` schema: `id`, `supplier_id`, `purchase_type` (enum), `purchase_url` (empty string when not applicable, never null), embedded `supplier` (id, name, address, maps_link, phone).
- Extend `PurchaseListItem` schema with the same `suppliers` array. The backend populates it from the already-extended `Material`.
- Extend `POST /materials` and `PUT /materials/{id}` request bodies with an optional `suppliers: [{supplier_id, purchase_type, purchase_url}]` field. Omitting the field is equivalent to sending an empty array (clears all links). `purchase_url` is always a string, empty for non-online types.
- All changes go through `libs/api-contract/src/api.yaml`; Kubb codegen is run and the generated client is committed.

---

## Out of Scope

Listed so reviewers don't expand the phase PRs:

- **Per-supplier pricing.** Same `materials.price` applies regardless of supplier.
- **Persisting a "chosen supplier" per purchase-list item.** No new `purchase_list_choices` table.
- **Recording actual purchases / a purchase-fulfillment workflow.** This iteration only surfaces contact info.
- **Reverse view** ("show all materials this supplier provides") on the Supplier detail screen. Easy follow-up.
- **Mobile (Expo) parity.** Phases below target web only. Mobile follows in a separate effort once web is stable.
- **Bulk import** of supplier-material links via CSV.
- **Notifications / order placement** to the supplier (e.g. auto-send a WhatsApp template). The crew still composes the message themselves.

---

## Open Questions

1. **Phone-to-WhatsApp normalization.** Indonesian numbers are usually stored as `08xx…` but WhatsApp deep links need `628xx…`. Should the normalization live in `libs/ui` (frontend-only display concern) or as a new helper field on the supplier response? *Proposal: frontend-only utility for now, since the stored value should remain canonical.*
2. **Should the Material edit screen warn when removing the last supplier of a material that currently has stock-policy configured?** *Proposal: yes — a non-blocking inline warning, no modal.*
3. **Multiple online URLs per (material, supplier)?** Today the unique key allows the same supplier with different `purchase_type`s, but only one row per combination. If a supplier sells the same material on two separate URLs, that's awkward. *Proposal: accept the limitation for v1 (extremely uncommon); revisit if it surfaces in practice.*

---

## Rollout — Phased Implementation

Each phase is one small reviewable PR (~150–400 LOC). Phases 1–3 are backend-only and additive — the UI doesn't change until Phase 4, so each PR can ship independently with no flag.

### Phase 1 — DB migration + Go domain entity

**Scope:** Schema foundation only. No new endpoints exposed.

**Changes:**
- `apps/api/migrations/000010_create_material_suppliers.up.sql` (+ `.down.sql`).
- Extend `apps/api/domain/material_entity.go` with:
  - `PurchaseType` string-enum (`PurchaseTypeOnline | PurchaseTypeOffline | PurchaseTypeDelivery`).
  - `MaterialSupplier` struct (with embedded `Supplier`).
  - `Suppliers []MaterialSupplier` field on `Material` (nil by default — does not change existing JSON responses unless populated by the repository).
- Extend `apps/api/data/mysql/material_entity.go` with the `MaterialSupplier` GORM model.

**Verification:** `migrate up && migrate down` round-trips cleanly on a fresh DB; `go build ./...` passes.

**Size:** ~150 LOC.

### Phase 2 — Repository + usecase with validation

**Scope:** Server-side CRUD on the junction, scoped to a parent material.

**Changes:**
- Extend `apps/api/data/mysql/material_repo.go`:
  - `FindById` adds `Preload("Suppliers").Preload("Suppliers.Supplier")` (chain mirrors `variant_repo.go`).
  - New `ReplaceSuppliers(materialId int64, payload []MaterialSupplier)` — diff/upsert/soft-delete pattern lifted from `variant_repo.go`.
- Integrate supplier handling directly into `CreateMaterial` and `UpdateMaterialById` in `apps/api/domain/material_usecase.go`:
  - Both methods accept `material.Suppliers []MaterialSupplier` in the payload.
  - Validate each supplier link before any DB operation:
    - `purchase_type='online'`: `purchase_url` must be a valid `http(s)://` URL (max 2048 chars).
    - `purchase_type!='online'`: `purchase_url` must be empty.
    - `supplier_id` must exist and not be soft-deleted.
  - Wrap create/update + `ReplaceSuppliers` in a single transaction for atomicity.
- Extend `apps/api/domain/supplier_usecase.go` `Delete` to soft-delete the supplier's `material_suppliers` rows in the same transaction.
- Go unit tests for the validator and the diff logic.

**Verification:** `go test ./...` green. Manual repo-level test against local MySQL inserts/updates/deletes correctly.

**Size:** ~250 LOC + tests.

### Phase 3 — REST endpoints + OpenAPI contract update

**Scope:** Expose Phase 2 over HTTP, regenerate the API contract.

**Changes:**
- `apps/api/presentation/restapi/material_handler.go`:
  - `POST /materials` and `PUT /materials/{id}` request parsing extended to include `suppliers` array and pass it to the usecase.
  - `GET /materials/{materialId}` response now includes `suppliers` (auto, since Phase 2 loaded them).
- New transformer: `apps/api/presentation/restapi/material_supplier_transformer.go`.
- `libs/api-contract/src/api.yaml`:
  - New schema `MaterialSupplier` (with `purchase_type` enum).
  - Add `suppliers` array on `Material`.
  - Add `suppliers` field to `CreateMaterialRequest` and `UpdateMaterialRequest` schemas.
- Run Kubb codegen and commit the generated client. Call out generated files in the PR description so reviewers can collapse them.

**Verification:** OpenAPI lints cleanly; generated TS client compiles; `curl` against the new endpoint round-trips both create and edit cases.

**Size:** ~300 LOC including generated code.

### Phase 4 — Material detail page: manage suppliers (FR-2 frontend)

**Scope:** UI for "go to material page → add suppliers → pick purchase type".

**Changes:**
- Extend `libs/ui/src/domain/entities/Material.ts` with `MaterialSupplier`, `PurchaseType`.
- Extend repository interface `libs/ui/src/domain/repositories/material.ts` with `setMaterialSuppliers`.
- Implement in `libs/ui/src/data/api/material.ts` (use generated client) and `libs/ui/src/data/api/material.transformer.ts`.
- New usecase `libs/ui/src/domain/usecases/materialSuppliersSet.ts`.
- New component `libs/ui/src/presentation/components/materials/MaterialSuppliersForm.tsx`:
  - Supplier picker reusing the existing `supplierList` usecase.
  - Per-row purchase-type radio.
  - Conditional `purchase_url` input (shown + required only for `online`).
  - Conditional read-only previews: address+maps for `offline`, phone for `delivery`. Blocks submit if `delivery` is chosen on a supplier with no phone.
  - React Hook Form validation matching backend rules.
- Embed in `libs/ui/src/presentation/screens/MaterialUpdateScreen.tsx`.
- Add a read-only summary on `apps/web/src/pages/materials/[materialId].tsx`.

**Verification:** `nx serve web` → create a supplier; on a material detail page, add it with each of the three purchase types; reload and confirm persistence; submit an invalid URL → form rejects with the same message as the API would.

**Size:** ~400 LOC.

### Phase 5 — Purchase List grouped by supplier with action buttons (FR-3)

**Scope:** The main user-visible payoff.

**Changes:**
- Backend extends purchase-list response with `suppliers` per item:
  - `apps/api/domain/stock_check_entity.go` — `Suppliers []MaterialSupplier` on `PurchaseListItem`.
  - `apps/api/presentation/restapi/stock_check_handler.go` — populate from the already-extended `Material`.
  - `libs/api-contract/src/api.yaml` — extend purchase-list schemas; regenerate Kubb client.
- Frontend domain: extend `libs/ui/src/domain/entities/PurchaseList.ts` `PurchaseListItem` with `suppliers`.
- Frontend presentation in `libs/ui/src/presentation/components/purchaseLists/`:
  - New `PurchaseListGroupedView.tsx` — groups items by supplier; an item with N suppliers appears in N groups.
  - "Unassigned" group at the bottom for items with empty `suppliers`, with a CTA to the material edit page.
  - Per-row action button(s):
    - `online` → external-link button → `purchase_url` in a new tab.
    - `offline` → maps button → `supplier.maps_link` (fallback to a Google Maps search of `supplier.address`).
    - `delivery` → `tel:` link **and** `https://wa.me/<digits>` link.
  - Total at top sums each material once.
- Wire into `PurchaseListScreen.tsx` / `PurchaseListHandler.tsx`.

**Verification:** End-to-end on web: trigger a stock check that produces a purchase list; confirm grouping; click each action type and verify the correct URL / tel / WhatsApp deep link opens; a material with no linked suppliers lands in "Unassigned".

**Size:** ~400 LOC.

### Phase 6 — Purchase-type filter on Purchase List (FR-4)

**Scope:** Filter chips above the grouped list.

**Changes:**
- Frontend-only (the data needed is already loaded after Phase 5).
- Segmented control / chip group: `All | Online | Offline | Delivery` above the grouped view.
- Filter logic per FR-4 (ANY-match at the material level, per-row trim within a visible material, "Unassigned" hidden for non-"All").
- Selected filter persisted in URL query (`?purchaseType=online`).
- Empty state when filter yields nothing.

**Verification:** Switch between filters in the browser; confirm count + grouping behave as specified; reload page with `?purchaseType=delivery` and confirm the filter is restored.

**Size:** ~150 LOC.

---

## Rollout Order Summary

| # | Phase | Layer | Approx. PR size | Depends on |
|---|---|---|---|---|
| 1 | DB migration + Go entity | Backend | ~150 LOC | — |
| 2 | Repository + usecase + validation | Backend | ~250 LOC | Phase 1 |
| 3 | REST endpoints + OpenAPI regen | Backend + contract | ~300 LOC (mostly gen) | Phase 2 |
| 4 | Material detail — manage suppliers form | Frontend | ~400 LOC | Phase 3 |
| 5 | Purchase List grouped by supplier + actions | Backend + Frontend | ~400 LOC | Phase 3 |
| 6 | Purchase-type filter | Frontend | ~150 LOC | Phase 5 |

Phases 4 and 5 are independent after Phase 3 lands, so they can be developed in parallel by two engineers.
