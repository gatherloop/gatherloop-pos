# PRD + Implementation Plan: Expense Statistics

> One document, two parts. **Part A** is the PRD (the *what* and *why*). **Part B** is the phased implementation plan (the *how*), where each phase is one small, reviewable pull request.

---

# Part A — Product Requirements

## Problem Statement

Cafe staff diligently record every expense, and every expense is already tagged with a **budget type** (`budget_id` → Restock, Salary, Operational, …). But that data is write-only today: there is **no summary view anywhere** in the app.

At the end of the month nobody can answer, without manually paging through the expense list:

- *How much did we spend in total this month?*
- *How much of that went to restocking vs. salaries vs. operational costs?*
- *Is our operational spend trending up over the last few months?*

The raw data to answer all of these already exists — `expenses(created_at, budget_id, total)` with an index on `budget_id` (`apps/api/migrations/000001_initial_schema.up.sql:206-218`) — and the app already has a working template for exactly this kind of feature: the **Transaction Statistic** chart on the dashboard, complete with `groupBy date|month`, date-range presets, and custom ranges (`GET /transactions/statistics`, `apps/api/data/mysql/transaction_repo.go:193-221`).

### The feature in one sentence

**Add an expense statistics chart** that shows spend per period (month or day), with a toggle between **one combined total** and a **split per budget type**.

---

## Context: Existing System

- **Monorepo**: Nx. **Backend** Go (Gorilla Mux + GORM + MySQL), Clean Architecture (`presentation → domain → data`). **Frontends** Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI lib (`libs/ui/`), React Query, state-machine "usecase" pattern.
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`; Kubb generates the TS client + React Query hooks consumed by both apps.
- **Charts**: Victory (`victory` on web, `victory-native` on mobile), re-exported through `libs/ui/src/presentation/components/base`.

### Data model (already sufficient — no migration needed)

| Table | Relevant columns | Notes |
|---|---|---|
| `expenses` | `id`, `created_at`, `deleted_at`, `budget_id`, `total` | `idx_expenses_budget_id` exists; `total` is maintained on write. |
| `budgets` | `id`, `name`, `deleted_at` | Soft-deleted budgets may still be referenced by historical expenses. |

### Prior art: Transaction Statistic (the pattern we clone)

The dashboard date-range-filter feature (`docs/prd-dashboard-date-range-filter.md`) already built every layer this feature needs. The expense version is a structural copy:

| Layer | Existing file (transaction) | Expense equivalent (new) |
|---|---|---|
| SQL query | `apps/api/data/mysql/transaction_repo.go:193-221` | `expense_repo.go` — same shape + `GROUP BY budget_id` |
| Go usecase / handler / route | `transaction_usecase.go`, `transaction_handler.go`, `transaction_route.go` | expense counterparts |
| Contract | `api.yaml` `/transactions/statistics` | `/expenses/statistics` |
| TS entity + preset helpers | `libs/ui/src/domain/entities/TransactionStatistic.ts` (`TransactionStatisticPreset`, `getDateRangeForPreset`) | reuse the preset helpers as-is; new `ExpenseStatistic` entity |
| Usecase state machine | `libs/ui/src/domain/usecases/transactionStatisticList.ts` | `expenseStatisticList.ts` |
| URL query repo | `libs/ui/src/data/url/transactionStatisticListQuery.ts` | namespaced expense params (see D8) |
| Chart component | `libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx` | `ExpenseStatistic.tsx` (presets UI is reusable) |
| App / DI | `libs/ui/src/app/TransactionStatistic.tsx` | `ExpenseStatistic` widget + dashboard shell (see below) |
| Web SSR page | `apps/web/src/pages/index.tsx` | same page, prefetches both statistics |
| Mobile | `apps/mobile/src/app/App.tsx:271` mounts the dashboard | same mount point |

---

## Where should the statistics live? (placement decision)

You asked whether this belongs on the dashboard or on a separate page, keeping in mind that more statistics are coming (sales per product, material spend per week/month, …).

**Recommendation: keep the Dashboard (`/`) as the single statistics home, but restructure it into a *widget host* — and build Expense Statistics as the first self-contained widget.**

| Option | Pros | Cons |
|---|---|---|
| **A. Dashboard as widget host** *(recommended)* | One place to look every morning; matches user habit (dashboard already *is* the stats page); each widget is self-contained so it can be relocated later at near-zero cost; no new nav entry needed. | Page grows as widgets are added — mitigated by the escalation path below. |
| B. Separate page per statistic (e.g. `/expenses/statistics` under Finance) | Isolated, no dashboard changes. | Fragments insights across the sidebar; every future statistic needs a new route, menu item, and SSR page; nobody sees a "monthly overview" in one glance. |
| C. New "Reports" sidebar group now | Scales furthest. | Premature — we'd build navigation scaffolding for pages that don't exist yet. |

**Why A, concretely:** today `apps/web/src/pages/index.tsx` renders `TransactionStatisticApp`, whose screen owns the whole `Layout` (`TransactionStatisticScreen.tsx` renders `<Layout title="Dashboard">` around a single `<H4>Transaction Statistic</H4>` section). We invert that: a thin **Dashboard shell** owns the `Layout`, and each statistic (Transaction, Expense, and future Product Sales / Material Spend) becomes a **section widget** — its own component + handler + usecase + URL params, composed by the shell.

**Escalation path (explicitly planned, not built now):** when the dashboard exceeds ~3–4 widgets, promote widgets into a **"Reports"** sidebar group (`Sidebar.state.tsx`) with one page per report, keeping compact summary cards on the dashboard that link to them. Because each widget is self-contained after this restructure, that promotion is a page-wiring change, not a rewrite. This is how the future statistics land without ever redesigning the feature built here.

---

## Proposed Solution

### 1. Backend: `GET /expenses/statistics`

New endpoint mirroring `/transactions/statistics`, with one addition — the per-budget dimension:

| Param | Type | Meaning |
|---|---|---|
| `groupBy` | `date \| month` (optional, default `month`) | Period granularity. Same date formats as transactions (`%d-%m-%Y` / `%m-%Y`). |
| `startDate` | `string YYYY-MM-DD` (optional) | Inclusive lower bound on `created_at`. |
| `endDate` | `string YYYY-MM-DD` (optional) | Inclusive upper bound (implemented half-open, `< endDate + 1 day`), same as transactions. |

```sql
SELECT DATE_FORMAT(e.created_at, :fmt) AS date,
       e.budget_id                     AS budget_id,
       b.name                          AS budget_name,
       SUM(e.total)                    AS total
FROM expenses e
JOIN budgets b ON b.id = e.budget_id        -- soft-deleted budgets included: history keeps its label
WHERE e.deleted_at IS NULL
  AND e.created_at >= :startDate            -- when provided
  AND e.created_at <  :endDate + 1 day      -- when provided
GROUP BY DATE_FORMAT(e.created_at, :fmt), e.budget_id
ORDER BY MIN(e.created_at) ASC, b.name ASC;
```

The response is **flat per-period-per-budget rows**. The client derives both views from one payload:

- **Split view**: pivot rows into one series per budget (zero-filling periods where a budget had no spend, so lines align).
- **Combined view**: sum rows per period.

One endpoint, one fetch — toggling Combined ↔ By Budget is instant and never refetches.

### 2. Frontend: an Expense Statistics widget on the dashboard

Below the existing Transaction Statistic section:

- **Section title**: "Expense Statistic".
- **View toggle**: `By Budget | Combined` buttons (styled like the existing `Date | Month` group-by buttons). Default **By Budget** — the per-budget summary is the whole point of the feature.
- **Chart**: Victory line + scatter, same visual language as the transaction chart. *By Budget* renders one line per budget with a color-coded `VictoryLegend`; *Combined* renders a single total line.
- **Range control**: the same preset chips + custom range already built for transactions (`last7Days` … `thisYear`, `custom`), reusing `getDateRangeForPreset`. Default preset: **Last 12 months, grouped by `month`** — "how much do we spend on X every month" is the headline question, unlike transactions where day-level recency matters.
- **Group by**: the `Date | Month` buttons remain available for drill-down.
- **States**: loading / error-with-retry / empty ("No expenses in this range"), matching the transaction widget.

### 3. URL state (namespaced)

The dashboard URL already carries `groupBy`, `preset`, `startDate`, `endDate` for the transaction widget. The expense widget gets **prefixed params** so the two widgets never collide on the same page: `expenseView`, `expenseGroupBy`, `expensePreset`, `expenseStartDate`, `expenseEndDate`. Views stay shareable/bookmarkable and SSR-prefetchable, consistent with the existing mechanism.

---

## Confirmed Product Decisions

> Defaults chosen as a senior-eng recommendation; each is cheap to flip before build. Genuinely open items are in **Open Questions**.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Placement | **Dashboard as widget host**; expense stats is the second widget. Escalate to a "Reports" sidebar group only when widgets outgrow one page. | See placement section — one morning glance now, cheap promotion later. |
| D2 | Combined vs. split data flow | **One endpoint returns per-budget rows; combined is computed client-side.** | One fetch serves both views; toggle is instant; payload is tiny (≤ budgets × periods rows). |
| D3 | Response shape | **Flat rows** `{date, budgetId, budgetName, total}`. | Direct mirror of the SQL; the client pivot (with zero-fill) is a pure, unit-testable helper. Avoids nested schemas and Go-side re-aggregation. |
| D4 | Default view | **By Budget** (split). | The unmet need is the per-budget breakdown; the combined total was always one mental sum away. |
| D5 | Default range/granularity | **Last 12 months, `month`.** | Matches "every month" framing; ~12 points per line stays readable. Presets/groupBy let users drill to days. |
| D6 | Chart form | **Multi-line + scatter with legend** (split), single line (combined). | Reuses the exact Victory components and styling already shipped; works identically on `victory-native`. Stacked bars considered (see Open Q2). |
| D7 | Soft-deleted budgets | **Included in historical statistics**, under their original name. | Deleting a budget must not silently erase past spend from reports. Deleted *expenses* stay excluded (`deleted_at IS NULL`). |
| D8 | URL params | Prefixed: `expenseView`, `expenseGroupBy`, `expensePreset`, `expenseStartDate`, `expenseEndDate`. | Transaction params already own the unprefixed names on `/`. |
| D9 | Ordering & boundaries | `ORDER BY MIN(created_at)`; inclusive `endDate` via half-open SQL. | Carries over the correctness lessons already codified in the transaction endpoint (D6/D7 of the date-range PRD). |
| D10 | Validation | Malformed dates / `startDate > endDate` → **400**; valid-but-empty range → `[]` + empty state. | Identical contract semantics to `/transactions/statistics`. |
| D11 | Schema/migration | **None.** `expenses.total` and `idx_expenses_budget_id` already exist. | Pure read feature. |
| D12 | Dashboard restructure scope | Shell owns `Layout`; widgets own their own usecase/handler/URL params. **No behavior change** to the transaction widget. | This is the investment that makes future statistics (product sales, material spend) plug-in work. |

---

## Feature Requirements

### FR-1: Expense statistics endpoint (backend)
`GET /expenses/statistics` accepts optional `groupBy` (`date|month`, default `month`), `startDate`, `endDate` (`YYYY-MM-DD`, inclusive) and returns flat `{date, budgetId, budgetName, total}` rows: non-deleted expenses grouped by period and budget, joined to `budgets` for the name (including soft-deleted budgets), ordered chronologically then by budget name. (D3, D7, D9)

### FR-2: Input validation (backend)
Malformed dates → 400 (`"startDate must be YYYY-MM-DD"`); `startDate > endDate` → 400. No params → all history. Empty result → `200 []`. (D10)

### FR-3: Dashboard shell (web + shared UI)
The dashboard page becomes a shell owning `Layout`/logout, composing the Transaction Statistic and Expense Statistic sections. The transaction widget's behavior, URL params, and SSR prefetch are unchanged. (D12)

### FR-4: Expense statistics widget (web)
A dashboard section with: By Budget/Combined toggle (default By Budget), one line per budget with legend in split view, single line in combined view, the shared preset + custom-range control (default Last 12 months / `month`), Date/Month group-by buttons, and loading/error/empty states. Split view zero-fills missing periods per budget so lines align. (D4, D5, D6)

### FR-5: URL persistence & SSR (web)
`expenseView`, `expenseGroupBy`, `expensePreset`, `expenseStartDate`, `expenseEndDate` live in the URL; `apps/web/src/pages/index.tsx` prefetches both statistics server-side so the first paint has both charts. Reload/share reproduces the exact view. (D8)

### FR-6: Mobile parity
The React Native dashboard mounts the same shell/widgets from `libs/ui` with the same defaults and toggle. (existing pattern: `apps/mobile/src/app/App.tsx:271`)

### FR-7: No regressions
Transaction statistic behavior, its URL params, and every existing expense endpoint are untouched. All contract changes are additive.

---

## API Changes (all additive)

| Method | Path | Change |
|---|---|---|
| `GET` | `/expenses/statistics` | **New endpoint.** Query params `groupBy`, `startDate`, `endDate` (all optional). `200` → `ExpenseStatisticResponse` (`data: ExpenseStatistic[]` where `ExpenseStatistic = {date, budgetId, budgetName, total}`); `400` / `500` → `Error`. |

OpenAPI edit in `libs/api-contract/src/api.yaml` (place next to `/expenses`, mirror `/transactions/statistics` at `:1530`); Kubb regenerates the TS client. **No DB migration.**

> Routing note: register `/expenses/statistics` **before** `/expenses/{expenseId}` in `expense_route.go` so `statistics` isn't captured as an id (or rely on mux's exact-match ordering — verify in Phase 1 tests).

---

## Out of Scope

- **Product sales statistics** and **material spend statistics** — explicitly future widgets; this PRD only ensures the dashboard restructure (FR-3) gives them a plug-in slot.
- **"Reports" sidebar group / separate report pages** — the escalation path is documented, not built.
- **Budget balance / percentage-allocation reporting** (that's the existing Budget Tracking feature, untouched).
- **Wallet-dimension breakdown** of expenses (the list page already filters by wallet; add later if needed).
- **CSV/export, comparison overlays ("vs. last month"), stacked-bar or chart-library changes** beyond what D6 specifies.
- **Weekly grouping** — `groupBy` stays `date|month` for parity with transactions; `week` can be added to both endpoints later as one small PR.
- **DB schema changes / new indexes** — revisit only if profiling shows the `created_at` range scan is slow (same posture as the transaction endpoint).

---

## Open Questions

1. **Default view: By Budget or Combined?** Recommended By Budget (D4) — flip is a one-line default change.
2. **Lines or stacked bars for the split view?** Lines are recommended for reuse and trend-reading; stacked bars communicate part-to-whole per month better. If you prefer stacked bars, Phase 4 swaps `VictoryLine` for `VictoryStack`+`VictoryBar` (both available in Victory/victory-native) — scope is otherwise identical.
3. **Should the combined view also appear as a summary number** (e.g. "Total this period: Rp X" above the chart)? Cheap to add in Phase 4 if wanted.

_Everything else is decided above and ready to build against._

---

# Part B — Implementation Plan

Phases are **independently shippable and ordered**; each is **one small, reviewable PR** that keeps `main` green. Order: backend → contract/codegen → frontend plumbing → dashboard shell refactor → web widget → mobile → docs.

**Design rules (from Part A):**
- Clone the transaction-statistics pattern layer by layer; don't invent new abstractions except the dashboard shell (D12).
- Flat rows from the API; pivot/zero-fill/combine are pure client helpers with unit tests (D2, D3).
- All changes additive; no migration (D11); transaction widget untouched until the pure-refactor phase, and behaviorally untouched even then (FR-7).

---

## Phase 1: Backend — expense statistics endpoint

**Goal:** `GET /expenses/statistics` works end to end. Pure backend PR, verifiable with `curl` against seeded data.

**Changes**
- `apps/api/domain/expense_entity.go`: add `ExpenseStatistic{ Date string; BudgetId int64; BudgetName string; Total float32 }`.
- `apps/api/domain/expense_repository.go`: add `GetExpenseStatistics(ctx, groupBy string, startDate, endDate *time.Time)`.
- `apps/api/data/mysql/expense_repo.go`: implement the query from Part A (mirror `transaction_repo.go:193-221`: conditional range clauses, half-open end, `ORDER BY MIN(created_at) ASC, b.name ASC`); add the row struct + transformer alongside the existing mysql expense transformers.
- `apps/api/domain/expense_usecase.go`: `GetExpenseStatistics` pass-through with `startDate <= endDate` validation (mirror the transaction usecase).
- `apps/api/presentation/restapi/expense_handler.go`: parse `groupBy`/`startDate`/`endDate` with the existing `base_transformers.go` helpers (`GetGroupBy`, `GetStartDate`, `GetEndDate`); 400 on invalid input; add response transformer.
- `apps/api/presentation/restapi/expense_route.go`: register `GET /expenses/statistics` (before the `{expenseId}` route — see routing note).
- `apps/api/data/mock/expense_repository.go`: extend the mock.

**Tests** (mirror the transaction statistics tests)
- Usecase: `startDate > endDate` → error; nil params → delegated unchanged.
- Handler/repo: grouping by month and by date; per-budget split sums correctly; range bounds inclusive; deleted expenses excluded; soft-deleted budget still appears with its name; chronological order across a year boundary; `/expenses/statistics` not swallowed by `/expenses/{expenseId}`.

**Exit criteria:** `go test ./apps/api/...` green; endpoint returns correct flat rows.

---

## Phase 2: API contract + codegen

**Goal:** Generated TS client knows the new endpoint; both apps still compile with zero call-site changes.

**Changes**
- `libs/api-contract/src/api.yaml`: add `/expenses/statistics` path (params + `200/400/500`) and `ExpenseStatistic` / `ExpenseStatisticResponse` schemas, mirroring the transaction equivalents.
- Regenerate the Kubb client (same command used for prior contract changes).

**Exit criteria:** `nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` green; generated `expenseStatistics` hook/client exists.

---

## Phase 3: Frontend domain + data plumbing (no UI yet)

**Goal:** Everything below the component layer, fully unit-tested, with no visible change.

**Changes**
- `libs/ui/src/domain/entities/ExpenseStatistic.ts`: entity `{date, budgetId, budgetName, total}`; `ExpenseStatisticView = 'budget' | 'combined'`; reuse `TransactionStatisticPreset` + `getDateRangeForPreset` (re-export or lift to a shared `StatisticPreset` if cleaner).
- Pure helpers (unit-tested): `pivotExpenseStatistics(rows)` → per-budget series with zero-filled periods; `combineExpenseStatistics(rows)` → per-period totals.
- `libs/ui/src/domain/repositories/expense.ts`: add `getExpenseStatisticList` / `fetchExpenseStatisticList({groupBy, startDate, endDate})`.
- `libs/ui/src/data/api/expense.ts`: implement via the generated client + query key (mirror `data/api/transaction.ts`).
- `libs/ui/src/data/url/expenseStatisticListQuery.ts`: get/set for the five prefixed params (D8), defaults `view=budget`, `preset=last12Months`, `groupBy=month`.
- `libs/ui/src/domain/usecases/expenseStatisticList.ts`: state machine cloned from `transactionStatisticList.ts` — states `idle/loading/loaded/error`; actions `FETCH`, `FETCH_SUCCESS`, `FETCH_ERROR`, `SET_GROUP_BY`, `SET_DATE_RANGE`, plus `SET_VIEW` (pure context change, **no refetch** — D2).
- Mocks: `libs/ui/src/data/mock/` counterparts for repo + URL query.

**Tests:** usecase transitions (incl. `SET_VIEW` not triggering fetch); pivot/combine helpers (zero-fill, multi-budget, empty input); URL defaults.

**Exit criteria:** `nx test ui` green; no rendered change anywhere.

---

## Phase 4: Dashboard shell refactor (pure refactor, no new features)

**Goal:** The dashboard can host multiple widgets. **Zero behavior change** — this PR is reviewable as "same pixels, new structure".

**Changes**
- New `DashboardScreen`/shell in `libs/ui` owning `<Layout title="Dashboard">` + logout; `TransactionStatisticScreen` (`libs/ui/src/presentation/screens/TransactionStatisticScreen.tsx`) becomes a Layout-less **section** rendered by the shell.
- New `DashboardApp` in `libs/ui/src/app/` wiring auth/logout once and composing the transaction widget (expense widget lands next phase); `apps/web/src/pages/index.tsx` and `apps/mobile/src/app/App.tsx:271` switch from `TransactionStatisticApp` to `DashboardApp` (keep `TransactionStatisticApp` as a thin alias or delete it and update imports — reviewer's pick).
- Update affected stories/tests.

**Exit criteria:** Web + mobile dashboards render identically to before; existing transaction-statistic tests pass unchanged; URL params behave exactly as before.

---

## Phase 5: Web UI — expense statistics widget

**Goal:** The feature becomes visible: FR-4 + FR-5 on web.

**Changes**
- `libs/ui/src/presentation/components/expenses/ExpenseStatistic.tsx`: chart component — By Budget/Combined toggle, preset + custom-range control (reuse/extract the control from `TransactionStatistic.tsx` into a shared `StatisticDateRangeControl` rather than copy-pasting), Date/Month buttons, `VictoryLegend` with one line+scatter per budget, empty/loading/error states.
- `ExpenseStatisticSection` handler mapping usecase state → props (mirror `TransactionStatisticHandler.tsx`), added to the `DashboardApp` shell under the transaction section.
- `apps/web/src/pages/index.tsx`: read expense params from the URL, SSR-prefetch `fetchExpenseStatisticList`, pass both widgets' initial params (FR-5).
- Stories for: split view, combined view, single budget, empty range, error.

**Verify:** `nx serve web` — dashboard shows both charts; toggle flips instantly without a network call; presets/custom range/groupBy refetch and update the URL; reload reproduces the view; empty range shows the empty state. `nx test ui` / `nx test web`.

**Exit criteria:** All FR-4/FR-5 cases reproduce; transaction widget unaffected.

---

## Phase 6: Mobile parity

**Goal:** FR-6 — the same widget on React Native.

**Changes**
- `apps/mobile/src/app/App.tsx`: pass expense-statistic initial params (defaults) into `DashboardApp`, like the transaction params today (client-side fetch, no SSR).
- Verify the shared components on `victory-native`; substitute mobile-appropriate date inputs for the custom range if the web inputs don't translate (same fallback the transaction widget uses).

**Verify:** `nx test mobile`; on emulator walk toggle/preset/custom/empty cases.

**Exit criteria:** Mobile dashboard shows both statistics with correct totals and working toggle.

---

## Phase 7: Documentation + release

1. Update `README.md` §2 (Expense Tracking / feature list) to mention expense statistics.
2. Update `E2E_TEST_PLAN.md` with: split-vs-combined toggle, per-budget totals correctness, deleted-budget history, empty range.
3. Short owner note in `docs/`: how to read the chart, and the planned "Reports" escalation path for future statistics (so the placement decision is discoverable later).
4. Each PR description links this doc and lists the FR cases verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dashboard shell refactor (Phase 4) accidentally changes transaction-widget behavior | Medium | Medium | Phase 4 is a *pure* refactor PR with no feature code; existing handler/usecase tests must pass unchanged; screenshot before/after in the PR. |
| Route conflict: `/expenses/statistics` matched as `/expenses/{expenseId}` | Medium | High (500s/404s) | Register the static route first; explicit handler test in Phase 1. |
| Many budgets → unreadable multi-line chart | Low (budget count is small and operator-controlled) | Low | Legend + distinct colors; if budget count grows, Open Q2's stacked bars or a top-N grouping is the escape hatch. |
| Zero-fill pivot bugs (misaligned series when a budget skips a month) | Medium | Medium | Pivot is a pure helper with dedicated unit tests incl. gap cases (Phase 3). |
| URL param collision between the two widgets on `/` | Low | Medium | Prefixed params (D8) decided up front; SSR + client read the same query repo. |
| Unbounded default query on years of expenses | Low | Low | Default preset bounds to 12 months; expense row volume is far below transactions. |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Backend endpoint | 1 day | 2 |
| 2 Contract + codegen | 0.5 day | 3 |
| 3 Frontend plumbing + helpers | 1 day | 5 |
| 4 Dashboard shell refactor | 0.5–1 day | 5 |
| 5 Web widget UI | 1–1.5 days | 6 |
| 6 Mobile parity | 0.5–1 day | 7 |
| 7 Docs + release | 0.5 day | — |

**Total:** ~5.5–6.5 working days, single engineer. Phases 3 and 4 are independent of each other (both only block Phase 5), so two engineers could parallelize them. After Phase 5 the core value — monthly per-budget spend at a glance — is live on web.
