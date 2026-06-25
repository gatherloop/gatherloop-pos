# PRD + Implementation Plan: Product & Variant Sales Statistics

> One document, two parts. **Part A** is the PRD (the *what* and *why*). **Part B** is the phased implementation plan (the *how*), where each phase is one small, reviewable pull request.

---

# Part A — Product Requirements

## Problem Statement

The POS records every sale down to the **variant** level (`transaction_items.variant_id`, `amount`, `subtotal`), but the owner has **no way to see how each product or variant actually sells**. The only existing analytics is the dashboard's **Transaction Statistic** chart, which shows total revenue and income over time (`/transactions/statistics`) — it answers *"how much money did the cafe make?"* but never *"which items made it?"*.

The owner is trying to make three concrete operational decisions and currently has to guess:

1. **Which variants to remove.** *"How much is this variant purchased compared to other variants of the same product?"* If "Iced Latte — Large" outsells "Iced Latte — Small" 20:1, Small is dead weight on the menu and the materials behind it tie up stock.
2. **What sells best across the whole menu.** *"How does each product's sales compare to other products — and how do variants compare to variants, even across different products?"* A ranked, comparable view of best- and worst-sellers.
3. **When items are purchased.** *"When is this variant bought?"* The trend over time (and the time-of-day / day-of-week pattern) so the owner can plan stock, staffing, and promotions.

Today answering any of these means manually exporting transactions and pivoting them in a spreadsheet. There is no in-app screen, no endpoint, and no aggregation.

### The feature in one sentence

**Add a Product & Variant Sales Statistics feature** — ranked, comparable sales metrics (quantity sold, revenue, share %) per product and per variant over a chosen date range, plus a "when purchased" trend — so the owner can decide what to keep, what to cut, and when to stock it.

---

## Context: Existing System

- **Monorepo**: Nx. **Backend** Go (Gorilla Mux + GORM + MySQL), Clean Architecture (`presentation → domain → data`). **Frontends** Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI lib (`libs/ui/`), React Query, custom state-machine "usecase" pattern (`ts-pattern`).
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`; **Kubb** generates the TS client + React-Query hooks consumed by both apps.

### The data we already capture

The schema (`apps/api/migrations/000001_initial_schema.up.sql`) already holds everything this feature needs — **no new columns are required**:

| Table | Relevant columns | Role in this feature |
|---|---|---|
| `transaction_items` | `transaction_id`, `variant_id`, `amount`, `price`, `discount_amount`, `subtotal`, `product_name` | The fact rows. `amount` = quantity sold; `subtotal` = revenue for that line; `product_name` is a **snapshot** of the product name at sale time. |
| `transactions` | `id`, `created_at`, `paid_at`, `deleted_at` | Time dimension (`created_at`) and the soft-delete / paid filters. |
| `variants` | `id`, `product_id`, `name`, `price`, `deleted_at` | Variant identity + display name. May be soft-deleted while still referenced by historical items. |
| `products` | `id`, `category_id`, `name`, `deleted_at` | Product identity for the product-level roll-up. |
| `categories` | `id`, `name` | Optional grouping dimension (future). |

Key facts that shape the design:

- **Quantity = `SUM(transaction_items.amount)`**, **Revenue = `SUM(transaction_items.subtotal)`**. Both already net of per-item discounts (`discount_amount` is already reflected in `subtotal`).
- A **variant belongs to exactly one product** (`variants.product_id`), so the product-level roll-up is a straight `JOIN` + re-aggregate of the variant numbers — the two views are always consistent.
- **Variants and products can be soft-deleted** (`deleted_at`) but their historical `transaction_items` remain. Statistics must still attribute and **display** those sales (using `transaction_items.product_name` / `variants.name` as a fallback label), or the owner can't see *why* they removed something.
- `transaction_items` already has `idx_transaction_items_variant_id`; `variants` has `idx_variants_product_id`. The date filter lands on `transactions.created_at`.

### The existing statistics pattern (our template)

There is already a full vertical slice for time-series transaction statistics that this feature mirrors layer-for-layer:

| Layer | File | What it does |
|---|---|---|
| Contract | `libs/api-contract/src/api.yaml:1528` (`/transactions/statistics`), `:3427` (`TransactionStatistic`), `:4147` (response) | `GET` with `groupBy` + `startDate`/`endDate`. |
| Route | `apps/api/presentation/restapi/transaction_route.go` | `/transactions/statistics` registered before the `{transactionId}` routes. |
| Handler | `apps/api/presentation/restapi/transaction_handler.go:170` | Parses `groupBy` + dates (`GetGroupBy`, `GetStartDate`, `GetEndDate`), calls usecase, maps to API. |
| Usecase | `apps/api/domain/transaction_usecase.go:345` | Thin pass-through + validation. |
| Repo iface | `apps/api/domain/transaction_repository.go:20` | `GetTransactionStatistics(ctx, groupBy, startDate, endDate)`. |
| MySQL repo | `apps/api/data/mysql/transaction_repo.go:193` | `GROUP BY DATE_FORMAT(created_at, …)`, `SUM(...)`, optional date `WHERE`, `ORDER BY MIN(created_at)`. |
| Entity | `apps/api/domain/transaction_entity.go:55` (`TransactionStatistic`) | `{ Date, Total, TotalIncome }`. |
| FE entity | `libs/ui/src/domain/entities/TransactionStatistic.ts` | `{ date, total, totalIncome }`. |
| FE usecase | `libs/ui/src/domain/usecases/transactionStatisticList.ts` | `idle/loading/loaded/error` state machine; `FETCH`, `SET_GROUP_BY`, `SET_DATE_RANGE`. |
| FE data/url | `libs/ui/src/data/{api,url,mock}/transaction*` | API client, URL-state, mocks. |
| Screen/handler/view | `libs/ui/src/presentation/screens/TransactionStatistic*`, `components/transactions/TransactionStatistic.tsx` | Tamagui screen + Victory chart. |

We follow this exact path. We also reuse the **date-range filter** (presets + custom range) already specced in `docs/prd-dashboard-date-range-filter.md` and its `GetStartDate`/`GetEndDate` parsers.

---

## Proposed Solution

A new **"Sales Statistics"** area answering the three owner questions, built on three additive read-only endpoints and a new set of frontend screens. No schema migration; pure aggregation over existing data.

### 1. Variant ranking — *"which variant vs. other variants"* (Q1)

`GET /variants/statistics` returns one row per variant that sold in the range, each with:

- `quantitySold` = `SUM(amount)`, `revenue` = `SUM(subtotal)`, `transactionCount` = `COUNT(DISTINCT transaction_id)`.
- `quantityShare` / `revenueShare` = this variant's quantity / revenue ÷ the range total (so "compared to other variants" is answered directly, 0–1).
- Identity: `variantId`, `variantName`, `productId`, `productName`, `isDeleted` (so removed variants still show, flagged).

Sortable (`sortBy=quantity|revenue`, `order`), with an optional `productId` filter to scope to **one product's variants** (the direct "which size/variant of *this* product to cut" view) and an optional `limit` for top-N. Because every row carries `quantityShare`, variants are comparable **across different products too** (Q2's "variants compare to variants on other product").

### 2. Product ranking — *"which product vs. other products"* (Q2)

`GET /products/statistics` is the same aggregation rolled up to the product (`JOIN variants ON transaction_items.variant_id`, group by `products.id`). Same metrics + shares, sortable, top-N. Answers "how does each product sell vs. others" and surfaces menu-wide best/worst sellers.

### 3. "When purchased" — the time dimension (Q3)

For a selected variant or product, `GET /variants/{variantId}/statistics/timeseries` (and the product equivalent) returns the existing `TransactionStatistic` shape (`{ date, total, … }`) **filtered to that variant/product**, grouped by `date|month` — reusing the dashboard chart wholesale. This shows the **purchase trend over time** so the owner sees when an item is bought and whether it's rising or dying.

> **Time-of-day / day-of-week** ("busiest hour for Iced Latte") is a natural extension of the same query (`GROUP BY HOUR(created_at)`), called out as a **fast-follow** (Phase 7) so the core ranking ships first.

### 4. Frontend: a Sales Statistics screen

A new screen (registered alongside the existing dashboard) with:

- A **date-range filter** (reusing the presets/custom-range pattern from `prd-dashboard-date-range-filter.md`).
- A **Products** tab: ranked table (qty, revenue, share) + a share **bar chart**; row click → product time-series.
- A **Variants** tab: same, with an optional product filter; row click → variant time-series.
- A **drill-down** time chart (reusing `TransactionStatistic.tsx`) answering "when purchased".

All wired through the same clean-architecture layers (entity → repository → data → usecase state machine → presenter → view) and mirrored on mobile.

---

## Confirmed Product Decisions

> Defaults chosen as a senior-eng recommendation. Each is cheap to flip — called out so you can veto before build. Things that genuinely need your call are in **Open Questions**.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Core metrics | **`quantitySold` (`SUM(amount)`), `revenue` (`SUM(subtotal)`), `transactionCount` (`COUNT(DISTINCT transaction_id)`).** | Directly answer "how much purchased". `subtotal` already nets discounts. |
| D2 | "Compared to other" metric | **`quantityShare` & `revenueShare`** (this row ÷ range total, 0–1). | Makes Q1/Q2 a single comparable number; renders as a share bar. |
| D3 | Default ranking sort | **By `quantitySold` desc.** | "Which is purchased most/least" is the stated question; revenue is one toggle away. |
| D4 | Granularity levels | **Two endpoints: per-product and per-variant.** Variant rows carry `productId/productName`. | Covers all three comparison axes (variant-in-product, product-vs-product, variant-vs-variant cross-product) without a combinatorial endpoint. |
| D5 | "When purchased" | **Reuse `TransactionStatistic` time-series, filtered by variant/product, `groupBy=date\|month`.** | Reuses the existing chart + entity; zero new FE chart work for the trend. |
| D6 | Which transactions count | **All non-deleted transactions in range (`deleted_at IS NULL`), regardless of paid status.** | Matches existing `/transactions/statistics` behavior; "purchased" = recorded sale. Paid-only is an Open Question. |
| D7 | Deleted variants/products | **Included and flagged `isDeleted: true`**, labeled from `variants.name` / `transaction_items.product_name`. | The owner needs to see what a removed item *used* to sell; hiding it defeats the "what to cut / did cutting help" use case. |
| D8 | Date range | **Optional `startDate`/`endDate` (`YYYY-MM-DD`), inclusive end, half-open in SQL** — same semantics & parsers as the dashboard filter. | Consistency; reuse `GetStartDate`/`GetEndDate`. Omitting both = all-time. |
| D9 | Product filter on variant stats | **Optional `productId` query param** on `/variants/statistics`. | Enables the focused "this product's variants only" view (Q1) from the same endpoint. |
| D10 | Top-N | **Optional `limit` (+ deterministic tie-break by `variantId`/`productId`).** | Keeps the ranking table and chart readable; shares are still computed against the **full** range total, not just the top N. |
| D11 | Empty range | **Return `[]`; UI shows an empty state**, not an error. | A valid range with no sales is normal. |
| D12 | Schema impact | **None.** Pure aggregation over existing tables/indexes. | No migration; lower risk. Add a `created_at` index only if profiling demands (Risks). |
| D13 | Backward compatibility | **All changes additive** — new endpoints + new screens only. Existing flows untouched. | No breaking change. |

---

## Feature Requirements

### FR-1: Variant sales aggregation (backend)
`GET /variants/statistics` returns, for each variant with ≥1 sold line in the range: `variantId`, `variantName`, `productId`, `productName`, `isDeleted`, `quantitySold`, `revenue`, `transactionCount`, `quantityShare`, `revenueShare`. Supports `startDate`, `endDate`, `productId`, `sortBy` (`quantity|revenue`), `order`, `limit`. Counts non-deleted transactions only. (D1, D2, D6, D7, D8, D9, D10)

### FR-2: Product sales aggregation (backend)
`GET /products/statistics` returns the same metrics rolled up per product: `productId`, `productName`, `categoryId`, `isDeleted`, `quantitySold`, `revenue`, `transactionCount`, `quantityShare`, `revenueShare`. Supports `startDate`, `endDate`, `sortBy`, `order`, `limit`. (D1–D8, D10) Product-level totals **equal** the sum of their variants' totals for the same range (consistency invariant).

### FR-3: Shares computed against the full range total (backend)
`quantityShare` / `revenueShare` use the **range-wide** denominator (all variants/products in range), so they remain meaningful even when `limit` is applied. Shares within a result set need not sum to 1 when `limit` or `productId` narrows the rows. (D2, D10)

### FR-4: "When purchased" time-series (backend)
`GET /variants/{variantId}/statistics/timeseries` and `GET /products/{productId}/statistics/timeseries` return the existing `TransactionStatistic` shape filtered to that variant/product, supporting `groupBy=date|month` + `startDate`/`endDate`, ordered chronologically. (D5, D8)

### FR-5: Date-range filtering (backend)
All four endpoints accept optional `startDate`/`endDate` (`YYYY-MM-DD`), inclusive end (half-open `< endDate + 1 day` in SQL), reusing `GetStartDate`/`GetEndDate`. Invalid dates / `startDate > endDate` → **400**. Omitting both = all-time. (D8)

### FR-6: Sales Statistics screen — Products & Variants ranking (web)
A new screen with a date-range filter and two tabs (Products, Variants). Each tab shows a **ranked table** (name, quantity, revenue, share) and a **share bar chart**, with a sort toggle (quantity/revenue) and, for Variants, an optional product filter. Deleted items render with a "removed" badge. Empty range → empty state. (FR-1, FR-2, D3, D7, D11)

### FR-7: Drill-down "when purchased" chart (web)
Clicking a product or variant row opens its time-series using the existing `TransactionStatistic` chart, honoring the same date range and a `date|month` toggle. (FR-4, D5)

### FR-8: URL persistence & SSR
Range, active tab, sort, and `productId` filter live in the URL query string (mirroring `transactionStatisticListQuery.ts`), so views are shareable and the web SSR prefetch reflects them on first paint. (consistent with existing dashboard)

### FR-9: Mobile parity
The React Native app offers the same ranking tabs + drill-down, reusing shared `libs/ui` primitives, usecases, and repositories. (D13)

### FR-10: Backward compatibility
All endpoints and screens are new and additive; no existing API, screen, or query changes behavior. (D13)

---

## API Changes (all additive, no migration)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/variants/statistics` | Variant ranking. Query: `startDate?`, `endDate?`, `productId?`, `sortBy?`, `order?`, `limit?`. → `VariantStatisticResponse`. |
| `GET` | `/products/statistics` | Product ranking. Query: `startDate?`, `endDate?`, `sortBy?`, `order?`, `limit?`. → `ProductStatisticResponse`. |
| `GET` | `/variants/{variantId}/statistics/timeseries` | Variant trend. Query: `groupBy?`, `startDate?`, `endDate?`. → `TransactionStatisticResponse` (reused). |
| `GET` | `/products/{productId}/statistics/timeseries` | Product trend. Same as above. |

New schemas `VariantStatistic` / `ProductStatistic` (+ `*Response` wrappers) in `libs/api-contract/src/api.yaml`; the timeseries endpoints **reuse** `TransactionStatistic`. Kubb regenerates the TS client. **Statistics routes are registered before `/{id}` routes** so `/variants/statistics` isn't captured by `/variants/{variantId}` (same ordering already used in `transaction_route.go`).

---

## Out of Scope

- **New captured data / schema changes** — no new columns; we only aggregate what `transaction_items` already stores.
- **Profit / cost-of-goods (COGS) per variant** — the data exists (`variant_materials`) but margin analytics is a separate effort.
- **Category-level and option-value-level breakdowns** (e.g. "how do all *Large* drinks sell") — natural future dimensions, not in this pass.
- **CSV / PDF export** of the ranking.
- **Forecasting / recommendations** ("auto-suggest variants to remove") — we show the data; the owner decides.
- **Time-of-day / day-of-week heatmap** — fast-follow (Phase 7), gated behind the core ranking shipping.
- **Per-customer or per-cashier analytics.**
- **Timezone handling** — uses the server's existing behavior, same as `/transactions/statistics`.

---

## Open Questions

1. **Paid-only?** D6 counts *all* non-deleted transactions (matching the existing dashboard). Should ranking instead count only **paid** (`paid_at IS NOT NULL`) sales, or expose a `paymentStatus` filter like `GetTransactionList` already has? (Recommendation: match existing behavior now; add the filter later.)
2. **Primary ranking metric** — is **quantity** the right default (D3), or does the owner think in **revenue** first? (One toggle either way.)
3. **"When purchased" granularity** — is the date/month **trend** (D5) enough for v1, or is the **hour-of-day / day-of-week** pattern the actually-wanted "when" (pull Phase 7 forward)?
4. **Top-N default** — should the tables default to top 20 with "show all", or list everything? Depends on menu size.
5. **Rental items** — `transaction_items` includes rental variants (`rental_id`, products with `sale_type = rental`). Include them in sales stats, exclude them, or split purchase vs. rental? (Recommendation: include but expose `saleType` so the UI can filter.)

_Everything else is decided above and ready to build against._

---

# Part B — Implementation Plan

Companion to Part A. Phases are **independently shippable and ordered**; each is **one small PR**. Order: backend variant query → backend product query → backend time-series → contract/codegen → FE plumbing → web ranking UI → web drill-down → mobile → docs. **No DB migration.** The time-series reuses the existing `TransactionStatistic` entity end to end.

**Design rules (from the PRD):**
- New endpoints/screens only; **everything additive** (D13, FR-10).
- Metrics: `SUM(amount)`, `SUM(subtotal)`, `COUNT(DISTINCT transaction_id)`; shares vs. the **full range total** (D1–D3, FR-3).
- Deleted variants/products **included + flagged**, labeled from snapshot names (D7).
- Date range optional, inclusive end, half-open in SQL; reuse `GetStartDate`/`GetEndDate` (D8, FR-5).
- Register `…/statistics` routes **before** `…/{id}` routes.

---

## Phase 1: Backend — variant sales aggregation

**Goal:** `GET /variants/statistics` returns ranked per-variant metrics with shares, date range, optional `productId`, sort, and `limit`. Reviewable in isolation against real data.

**Changes**
- `apps/api/domain/variant_entity.go`: add `VariantStatistic { VariantId, VariantName string, ProductId int64, ProductName string, IsDeleted bool, QuantitySold float32, Revenue float32, TransactionCount int64, QuantityShare float32, RevenueShare float32 }`.
- `apps/api/domain/variant_repository.go`: add `GetVariantStatistics(ctx, params VariantStatisticParams) ([]VariantStatistic, *Error)` (params = startDate, endDate, productId *int64, sortBy, order, limit). Regenerate the mock (`//go:generate mockgen`).
- `apps/api/domain/variant_usecase.go`: add `GetVariantStatistics` with `startDate ≤ endDate` validation (mirror `transaction_usecase.go:345`).
- `apps/api/data/mysql/variant_repo.go`: GORM query —
  `JOIN transaction_items ti ON ti.variant_id = variants.id JOIN transactions t ON t.id = ti.transaction_id WHERE t.deleted_at IS NULL` + optional `created_at` bounds + optional `variants.product_id = ?`; `SELECT variants.id, variants.name, variants.product_id, products.name, (variants.deleted_at IS NOT NULL), SUM(ti.amount), SUM(ti.subtotal), COUNT(DISTINCT ti.transaction_id)`; `GROUP BY variants.id`; `ORDER BY <sortBy> <order>, variants.id`; optional `LIMIT`. Compute range-wide totals in a second lightweight aggregate to fill `*Share` (FR-3).
- `apps/api/data/mock/variant_repository.go`: regenerate.
- `apps/api/presentation/restapi/variant_handler.go` + `variant_route.go`: add handler (parse dates via `GetStartDate`/`GetEndDate`, `productId`, `sortBy`, `order`, `limit`; 400 on bad input) and register `/variants/statistics` **before** `/variants/{variantId}`.
- `apps/api/presentation/restapi/variant_transformer.go`: `ToApiVariantStatistic`.

**Tests** (`variant_usecase_test.go`, `variant_repo_test.go`, handler test): `startDate > endDate` → 400; quantity vs. revenue sort; `productId` scoping; shares computed against full-range total even with `limit`; deleted variant still returned with `isDeleted=true`; empty range → `[]`.

**Exit criteria:** `go test ./apps/api/...` green; endpoint returns correct ranked variant stats; route ordering verified.

---

## Phase 2: Backend — product sales aggregation

**Goal:** `GET /products/statistics` rolls the same metrics up to the product, with the variant↔product totals invariant (FR-2).

**Changes** (mirror Phase 1 in the product domain)
- `product_entity.go`: `ProductStatistic { ProductId, ProductName, CategoryId, IsDeleted, QuantitySold, Revenue, TransactionCount, QuantityShare, RevenueShare }`.
- `product_repository.go` / `product_usecase.go` / `data/mysql/product_repo.go` / `data/mock/product_repository.go`: `GetProductStatistics(...)` — same join, `GROUP BY products.id` (join `variants` to reach `products`).
- `product_handler.go` / `product_route.go` / `product_transformer.go`: handler + `/products/statistics` registered **before** `/products/{productId}`.

**Tests:** product totals equal `SUM` of their variants' Phase-1 numbers for the same range (consistency); sort/limit/share/deleted/empty as Phase 1.

**Exit criteria:** `go test ./apps/api/...` green; product and variant aggregates reconcile.

---

## Phase 3: Backend — "when purchased" time-series

**Goal:** Per-variant and per-product trend endpoints reusing `TransactionStatistic`.

**Changes**
- Add repo methods `GetVariantStatisticTimeseries(ctx, variantId, groupBy, startDate, endDate)` and `GetProductStatisticTimeseries(...)`: clone the `transaction_repo.go:193` `DATE_FORMAT(created_at,…)` + `SUM` + `ORDER BY MIN(created_at)` query, joined to `transaction_items` and filtered by `variant_id` (or `product_id` via variants). Return `[]TransactionStatistic`.
- Usecases + handlers + routes: `/variants/{variantId}/statistics/timeseries`, `/products/{productId}/statistics/timeseries`; reuse `GetGroupBy`/`GetStartDate`/`GetEndDate` and `ToApiTransactionStatistic`.

**Tests:** trend rows only include the target variant/product; chronological order; `date` vs `month` grouping; range filter.

**Exit criteria:** `go test ./apps/api/...` green; trends return filtered, ordered series.

---

## Phase 4: API contract + codegen

**Goal:** Generated TS client exposes the four endpoints; both apps still compile.

**Changes**
- `libs/api-contract/src/api.yaml`: add paths `/variants/statistics`, `/products/statistics`, `/variants/{variantId}/statistics/timeseries`, `/products/{productId}/statistics/timeseries`; schemas `VariantStatistic`, `ProductStatistic`, `VariantStatisticResponse`, `ProductStatisticResponse`; timeseries reuse `TransactionStatistic`/`TransactionStatisticResponse`. Add `400` responses.
- Run Kubb codegen (`nx run api-contract:generate:ts`, and `:go` if backend types are generated).

**Verify:** `nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` green; generated hooks present.

**Exit criteria:** New typed clients/hooks generated; existing call sites untouched.

---

## Phase 5: Frontend data + domain plumbing (no new UI yet)

**Goal:** Thread the new stats through the clean-architecture layers behind a feature that's shippable headless.

**Changes**
- `libs/ui/src/domain/entities/`: `VariantStatistic`, `ProductStatistic` types (+ index export). Reuse existing `TransactionStatistic` for trends.
- `libs/ui/src/domain/repositories/`: `ProductStatisticListRepository`, `VariantStatisticListRepository` (fetch/get + params), and a query repo for URL state (mirror `transactionStatisticListQuery.ts`).
- `libs/ui/src/data/api/`: implement repos against the generated hooks; `data/mock/` + `data/url/` equivalents.
- `libs/ui/src/domain/usecases/`: `productStatisticList.ts`, `variantStatisticList.ts` state machines (`idle/loading/loaded/error`; actions `FETCH`, `SET_DATE_RANGE`, `SET_SORT`, `SET_PRODUCT_FILTER`) modeled on `transactionStatisticList.ts`. Reuse the shared date-range/preset helper from the dashboard filter work.
- `libs/ui/src/app/`: DI wiring app(s) for the new screens.

**Tests:** usecase tests (sort change refetches, date-range refetch, product filter) mirroring `transactionStatisticList.test.ts`.

**Exit criteria:** `nx test ui` green; data layer fetches ranking + trend; no visible screen yet (keeps PR small).

---

## Phase 6: Web UI — Products & Variants ranking screen

**Goal:** Operators see ranked tables + share bars with a date range and sort toggle (FR-6).

**Changes**
- `libs/ui/src/presentation/components/`: a `SalesStatistic` widget — date-range control (reuse dashboard presets), Products/Variants tabs, ranked table (name + removed badge, quantity, revenue, share), share **bar chart** (Victory, as in `TransactionStatistic.tsx`), sort toggle, and (Variants tab) a product filter.
- `libs/ui/src/presentation/screens/` + `controllers/` + handler/presenter/view: new `SalesStatisticScreen` following the `TransactionStatistic*` structure; register in `screens/index.ts` and the controllers index.
- `apps/web/src/pages/`: a new page (e.g. `/statistics/sales`) with SSR prefetch reading range/tab/sort/`productId` from the URL (FR-8). Add nav entry next to the dashboard.
- `*.stories.tsx` for loaded / empty / deleted-item / sorted states.

**Verify:** `nx serve web` — ranking renders, sort & range update the table + URL, deleted items badged, empty range → empty state. `nx test web`/`nx test ui`.

**Exit criteria:** FR-6 cases reproduce on web.

---

## Phase 7: Web UI — "when purchased" drill-down (+ optional time-of-day)

**Goal:** Row click opens the variant/product trend (FR-7); optionally add the hour-of-day/day-of-week view (Open Q3).

**Changes**
- Make table rows navigate to a drill-down that mounts the existing `TransactionStatistic` chart fed by the Phase-3 timeseries endpoint, honoring the active range + `date|month` toggle.
- *(Optional, if Open Q3 says so)* add a backend `GROUP BY HOUR(created_at)` / weekday variant and a small distribution chart.

**Verify:** clicking a top variant shows its trend; range/groupBy respected.

**Exit criteria:** FR-7 reproduces; trend answers "when purchased".

---

## Phase 8: Mobile parity

**Goal:** Same ranking tabs + drill-down on React Native (FR-9).

**Changes**
- `apps/mobile/src/app/App.tsx`: register the Sales Statistics route; mount the shared screen with initial params.
- Reuse shared `libs/ui` widgets/usecases; swap any web-only date input for an RN-compatible one, keeping the same repository contract.

**Verify:** `nx test mobile`; on emulator walk ranking → sort → range → drill-down → empty.

**Exit criteria:** Mobile reaches parity with web.

---

## Phase 9: Documentation + release

1. Owner guide under `docs/`: how to read the ranking, shares, and "when purchased"; how to decide what to cut.
2. Update `E2E_TEST_PLAN.md` with ranking/sort/range/drill-down/empty scenarios.
3. Update `README.md` feature list (add "Sales Statistics").
4. Each PR description links this doc and lists the FR cases verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Aggregation slow over 3+ yrs of `transaction_items` | Low–Med | Medium | Existing `idx_transaction_items_variant_id` + date filter limit scan; profile in Phase 1; add a `transactions(created_at)` index only if needed (D12). |
| Variant `/statistics` captured by `/variants/{id}` route | Medium | High | Register `…/statistics` **before** `…/{id}` (as `transaction_route.go` already does); add a route test. |
| Shares mislead when `limit`/`productId` narrows rows | Medium | Medium | Compute shares against the **full** range total (FR-3); document that visible shares needn't sum to 1; unit-test it. |
| Deleted variants/products drop out of stats | Medium | Medium | Explicitly include + flag `isDeleted`, label from snapshot `product_name`/`variants.name` (D7); test with a soft-deleted variant. |
| Product vs. variant totals disagree | Low | Medium | Same join/filters for both; Phase-2 reconciliation test asserts equality. |
| `endDate` off-by-one | Medium | Medium | Half-open `< endDate + 1 day` with an inclusive-boundary test (D8), reusing the dashboard parsers. |
| Rentals skew "sales" numbers | Med | Low | Open Q5: expose `saleType`; default include, let UI filter. |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Backend — variant aggregation | 1.5 days | 2,3,4 |
| 2 Backend — product aggregation | 1 day | 4 |
| 3 Backend — time-series | 1 day | 4 |
| 4 Contract + codegen | 0.5 day | 5 |
| 5 FE plumbing | 1.5 days | 6 |
| 6 Web ranking UI | 2 days | 7 |
| 7 Web drill-down (+opt. time-of-day) | 1 day | 8 |
| 8 Mobile parity | 1.5 days | 9 |
| 9 Docs + release | 0.5 day | — |

**Total:** ~10.5 working days, single engineer. Phases 1–2 alone already answer Q1 and Q2 over the API; Phase 3 adds Q3; Phases 6–7 make it usable in the product.
