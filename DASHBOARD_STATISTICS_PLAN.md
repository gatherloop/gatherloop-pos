# Dashboard (Statistics) Improvement Plan

## 1. Background & Goal

The business owner needs the Dashboard to answer three operational questions over a
**selectable date range, broken down per date**:

1. **Transaction totals** — how much revenue/income was made (already partially exists).
2. **Product / variant sales** — how many units of a specific product or variant were sold.
3. **Material usage** — how much of each material was consumed (to decide how much
   stock to keep in inventory).

This document defines the requirements, the data model we already have, and a
**phased implementation plan** where each phase maps to a small, independently
reviewable PR.

---

## 2. Current State (what already exists)

The app already ships a **Dashboard** screen — it is the `/` route in `apps/web`.

| Layer | File |
| --- | --- |
| Entity (BE) | `apps/api/domain/transaction_entity.go` → `TransactionStatistic{Date, Total, TotalIncome}` |
| Repo iface (BE) | `apps/api/domain/transaction_repository.go` → `GetTransactionStatistics(ctx, groupBy)` |
| Usecase (BE) | `apps/api/domain/transaction_usecase.go` |
| SQL (BE) | `apps/api/data/mysql/transaction_repo.go` → `SUM(total), SUM(total_income)` grouped by `DATE_FORMAT(created_at)` |
| Handler/Route (BE) | `apps/api/presentation/restapi/transaction_handler.go`, `transaction_route.go` → `GET /transactions/statistics` |
| Contract | `libs/api-contract/src/api.yaml` → `/transactions/statistics`, `TransactionStatistic` schema |
| Entity (FE) | `libs/ui/src/domain/entities/TransactionStatistic.ts` |
| Repo iface (FE) | `libs/ui/src/domain/repositories/transactionStatisticListQuery.ts` (`getGroupBy`/`setGroupBy`) |
| Usecase (FE) | `libs/ui/src/domain/usecases/transactionStatisticList.ts` (ts-pattern FSM) |
| Data (FE) | `libs/ui/src/data/{api,mock,url}/...` |
| Controller (FE) | `libs/ui/src/presentation/controllers/TransactionStatisticListController.tsx` |
| Screen/Handler (FE) | `libs/ui/src/presentation/screens/TransactionStatistic{Screen,Handler}.tsx` |
| Component (FE) | `libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx` (Victory line chart) |
| App/Page (FE) | `libs/ui/src/app/TransactionStatistic.tsx`, `apps/web/src/pages/index.tsx` |

**Gaps vs. the requirement:**
- The transaction statistic **has no date-range filter** — it aggregates all time.
- There is **no product/variant sales statistic**.
- There is **no material-usage statistic** exposed on the dashboard. (Note: the
  aggregation SQL already exists privately in
  `apps/api/data/mysql/material_repo.go` → `GetMaterialsWeeklyUsage`, which computes
  `SUM(variant_materials.amount * transaction_items.amount)` over a hardcoded 14-day
  window. This is the exact query we generalize for feature #3.)

### Relevant data model
- `transactions(created_at, total, total_income, deleted_at)`
- `transaction_items(transaction_id, variant_id, amount, ...)` — `amount` = units sold
- `variants(id, product_id, ...)`
- `variant_materials(variant_id, material_id, amount)` — `amount` = material per unit
- `materials(id, name, unit, ...)`

So:
- **Product/variant sales** = `SUM(transaction_items.amount)` joined to `transactions`,
  filtered by date range, grouped by `(date, variant_id)` or `(date, product_id)`.
- **Material usage** = `SUM(variant_materials.amount * transaction_items.amount)`,
  joined through `transaction_items → variants → variant_materials → materials`,
  filtered by date range, grouped by `(date, material_id)`.

---

## 3. Design Decisions

1. **Shared date-range control.** All three statistics use a common `dateFrom` /
   `dateTo` filter plus the existing `groupBy` (`date` | `month`). We reuse the
   `dateFrom`/`dateTo` query-param convention already present on the
   `/checklist-sessions` endpoint.
2. **One Dashboard page, three sections.** Keep a single Dashboard route with three
   stacked sections (Transactions, Product/Variant Sales, Material Usage) sharing the
   date-range control, rather than three separate pages. This matches the "business
   owner glances at the dashboard" use case. (Open question — see §6.)
3. **Follow the existing clean-architecture slice** exactly (entity → repo iface →
   usecase FSM → data api/mock/url → controller → handler → screen → component →
   app → page) so each feature is consistent and testable.
4. **Product vs variant granularity.** Support both: a selector toggles aggregation
   between product-level and variant-level, plus an optional single-product/variant
   filter for the "specific product" case.
5. **Backwards compatibility.** `dateFrom`/`dateTo` are optional query params; when
   omitted, behaviour is unchanged (sensible default = last 30 days on the FE).

---

## 4. Phased Implementation Plan (one PR per phase)

Each phase is sized to be reviewable in isolation. Backend-only phases land first so
the contract is stable before the frontend consumes it. Where a slice is large it is
split into a BE PR and a FE PR.

### Phase 0 — Date-range filter for the existing Transaction statistic
**Goal:** deliver requirement #1 (totals per date over a range) and establish the
reusable date-range pattern.

- **PR 0a (BE):**
  - Add optional `dateFrom`/`dateTo` query params to `/transactions/statistics` in
    `api.yaml`; regenerate Go + TS contract.
  - Extend `GetTransactionStatistics(ctx, groupBy, dateFrom, dateTo)` signature
    (domain repo iface, usecase, mysql repo, mock).
  - Add `WHERE created_at BETWEEN ? AND ?` to the SQL.
  - Update `transaction_handler.go` to parse the params; unit tests for the usecase.
- **PR 0b (FE):**
  - Extend `TransactionStatisticListQueryRepository` with `getDateRange`/`setDateRange`.
  - Add `dateFrom`/`dateTo` to the usecase FSM context + `SET_DATE_RANGE` action.
  - Wire `api`/`mock`/`url` data layers and the SSR page.
  - Add a date-range picker to the Dashboard control bar.

### Phase 1 — Product / Variant sales statistic
**Goal:** requirement #2.

- **PR 1a (BE):**
  - New domain entity `ProductSalesStatistic{Date, ProductId/VariantId, Name, Quantity, Subtotal}`.
  - New repo method `GetProductSalesStatistics(ctx, groupBy, dateFrom, dateTo, granularity, productId?, variantId?)`.
  - SQL joining `transaction_items → variants (→ products)`, grouped by date + product/variant.
  - Usecase + handler + new route `GET /statistics/product-sales`; `api.yaml` + contract; tests.
- **PR 1b (FE):**
  - Full clean-arch slice (entity, repo iface, usecase FSM, data api/mock/url,
    controller, handler, screen section, component).
  - Chart + table component with a product/variant granularity toggle and an optional
    product/variant selector. Add the section to the Dashboard screen.

### Phase 2 — Material usage statistic
**Goal:** requirement #3 (inventory planning).

- **PR 2a (BE):**
  - Generalize the existing `GetMaterialsWeeklyUsage` SQL into
    `GetMaterialUsageStatistics(ctx, groupBy, dateFrom, dateTo, materialId?)`
    (remove the hardcoded 14-day window / `/2` weekly divisor; group by date + material).
  - New entity `MaterialUsageStatistic{Date, MaterialId, Name, Unit, Quantity}`.
  - Usecase + handler + route `GET /statistics/material-usage`; `api.yaml` + contract; tests.
  - Keep `GetMaterialsWeeklyUsage` working (either reuse the generalized query
    internally or leave untouched) to avoid regressions in existing material screens.
- **PR 2b (FE):**
  - Full clean-arch slice + a chart/table section showing usage per material over the
    range, with an optional single-material filter. Add to the Dashboard screen.

### Phase 3 — Dashboard composition & polish (optional)
**Goal:** cohesive UX.

- Unify the three sections under one shared date-range + groupBy control (lift state /
  pass shared params), responsive layout, empty/error states, and a "last 7 / 30 days"
  quick-range preset.
- Optional: CSV export per section.

---

## 5. Cross-cutting Checklist (per feature)

- [ ] `api.yaml` updated; `nx run api-contract:generate:ts` and `:generate:go` run.
- [ ] Domain repo iface + mock regenerated (`go:generate mockgen`).
- [ ] Usecase unit test (BE Go) + usecase FSM test (FE, `*.test.ts`).
- [ ] Mock data repo + Storybook story for new component.
- [ ] SSR page wiring (`getServerSideProps`) where the section needs initial data.
- [ ] Mobile parity considered (shared `libs/ui` component renders on both).

---

## 6. Open Questions (for the owner / reviewer)

1. **Layout:** one Dashboard page with three sections (recommended), or three separate
   pages under a Dashboard menu?
2. **Sales metric:** for product/variant sales, do we chart **units sold (quantity)**,
   **revenue (subtotal)**, or both toggleable? (Plan assumes quantity primary, revenue
   secondary.)
3. **Material usage unit:** display raw consumed quantity in each material's `unit`,
   and/or convert to `purchaseUnit` for restock decisions?
4. **Default range:** last 30 days assumed when no range is selected — acceptable?
5. **Deleted/unpaid transactions:** sales & usage currently should likely include only
   non-deleted transactions (matching existing stat). Should unpaid transactions be
   included or excluded?
