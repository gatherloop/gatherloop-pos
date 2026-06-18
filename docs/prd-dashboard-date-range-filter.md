# PRD + Implementation Plan: Dashboard Date-Range Filter

> One document, two parts. **Part A** is the PRD (the *what* and *why*). **Part B** is the phased implementation plan (the *how*), where each phase is one small, reviewable pull request.

---

# Part A — Product Requirements

## Problem Statement

The dashboard (`Dashboard` → "Transaction Statistic") shows two line charts over time — **Total** (sum of `total`) and **Income** (sum of `total_income`) — with a single control: **Group By `date` | `month`**.

After ~3 years of POS usage the **date** view is unreadable. The backend returns **every day since the beginning of time** in one response and the chart plots them all:

- **Backend** (`apps/api/data/mysql/transaction_repo.go:193-208`) groups *all* non-deleted transactions by `DATE_FORMAT(created_at, '%d-%m-%Y')` with **no date filter and no `ORDER BY`**. Three years ≈ **1,000+ daily points** crammed into a 600×300 chart.
- The only way to reduce the noise today is to switch to **month**, which over-corrects (loses all day-level detail) and *still* grows unbounded (36+ months and counting).

There is **no way to look at "the last 7 days" or "March 2024"** — the two things an operator actually wants day-to-day.

### The feature in one sentence

**Add a date-range filter to the dashboard** — quick presets (Last 7 / 30 days, etc.) plus a custom start/end range — so the charts show a bounded, readable window instead of all history.

### Two correctness bugs we fix along the way

While the unbounded result set is the *product* problem, the current query also has two latent **correctness** bugs that a date range makes obvious, so we fix them in the same effort:

1. **No `ORDER BY`.** Points are plotted in whatever order MySQL returns rows. Victory draws the line in array order, so the line can zig-zag backwards in time.
2. **String-sorted months.** Even if we sorted the formatted string, `'%m-%Y'` makes `"01-2025"` sort *before* `"12-2024"`. Ordering must be by the real date, not the display string.

Both are fixed by ordering on a sortable key (the period's `MIN(created_at)` / a real date column) — see FR-2.

---

## Context: Existing System

- **Monorepo**: Nx. **Backend** Go (Gorilla Mux + GORM + MySQL), Clean Architecture (`presentation → domain → data`). **Frontends** Next.js web (`apps/web/`) + React Native (`apps/mobile/`) sharing a Tamagui UI lib (`libs/ui/`), React Query, custom state-machine "usecase" pattern (`ts-pattern`).
- **API contract**: OpenAPI at `libs/api-contract/src/api.yaml`; **Kubb** generates the TS client + React-Query hooks consumed by both apps.

### The dashboard today, end to end

| Layer | File | What it does |
|---|---|---|
| Web page (SSR) | `apps/web/src/pages/index.tsx:11-38` | Reads `groupBy` from URL, **prefetches** stats server-side, renders `TransactionStatisticApp`. |
| App / DI | `libs/ui/src/app/TransactionStatistic.tsx` | Wires repositories + usecase. |
| Screen | `libs/ui/src/presentation/screens/TransactionStatisticScreen.tsx` | Layout titled "Dashboard"; passes data + `groupBy` down. |
| Handler | `libs/ui/src/presentation/screens/TransactionStatisticHandler.tsx` | Maps usecase state → screen props; dispatches actions. |
| Chart | `libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx:25-126` | Victory dual line/scatter chart + Date/Month buttons (`:38-55`). |
| Usecase (state machine) | `libs/ui/src/domain/usecases/transactionStatisticList.ts` | States `idle/loading/loaded/error`; actions `FETCH`, `FETCH_SUCCESS`, `FETCH_ERROR`, `SET_GROUP_BY`. |
| Entity | `libs/ui/src/domain/entities/TransactionStatistic.ts` | `{ date: string; total: number; totalIncome: number }`. |
| Repo interface | `libs/ui/src/domain/repositories/transaction.ts:56-62` | `getTransactionStatisticList(groupBy)`, `fetchTransactionStatisticList(groupBy)`. |
| API repo | `libs/ui/src/data/api/transaction.ts:34-57` | Calls generated `transactionStatistics({ groupBy })`. |
| URL state | `libs/ui/src/data/url/transactionStatisticListQuery.ts` | Reads/writes `?groupBy=` (defaults `date`). |
| Contract | `libs/api-contract/src/api.yaml:1528-1551` | `GET /transactions/statistics?groupBy` → `TransactionStatisticResponse`. |
| Handler (Go) | `apps/api/presentation/restapi/transaction_handler.go:170-187` | Parses `groupBy`, calls usecase. |
| Param parse | `apps/api/presentation/restapi/base_transformers.go:113-115` | `GetGroupBy(r)`. |
| Usecase (Go) | `apps/api/domain/transaction_usecase.go:345-347` | Pass-through to repo. |
| Repo (Go) | `apps/api/data/mysql/transaction_repo.go:193-208` | The unbounded, unordered `GROUP BY DATE_FORMAT(...)` query. |
| Entity (Go) | `apps/api/domain/transaction_entity.go:55-59` | `TransactionStatistic{ Date string; Total int32; TotalIncome float32 }`. |

### Mobile

`apps/mobile/src/app/App.tsx` registers the dashboard as the initial route and currently mounts `TransactionStatisticApp` with **empty** params (no SSR prefetch) — it fetches client-side.

---

## Proposed Solution

Add an **optional bounded date range** to the statistics endpoint and a **range filter UI** to the dashboard. The existing `groupBy` stays. Nothing about the chart rendering, the income math, or the entity shape changes.

### 1. Backend: bounded, ordered query

`GET /transactions/statistics` gains two **optional** query params:

| Param | Type | Meaning |
|---|---|---|
| `startDate` | `string` (`YYYY-MM-DD`) | Inclusive lower bound on `created_at`. |
| `endDate` | `string` (`YYYY-MM-DD`) | Inclusive upper bound on `created_at` (whole day included). |

```sql
SELECT DATE_FORMAT(created_at, :fmt) AS date,
       SUM(total)        AS total,
       SUM(total_income) AS total_income
FROM transactions
WHERE deleted_at IS NULL
  AND created_at >= :startDate            -- when provided
  AND created_at <  :endDate + 1 day      -- inclusive end, half-open internally
GROUP BY DATE_FORMAT(created_at, :fmt)
ORDER BY MIN(created_at) ASC;             -- deterministic, real-time order (FR-2)
```

Both params are **optional and independent**: omit both → today's behavior (all history) so nothing breaks; provide one or both → bounded. The `+1 day` keeps the contract "inclusive `endDate`" while the SQL stays a clean half-open range (no `23:59:59` fudge).

### 2. Frontend: a range filter with presets + custom range

A **range control** above the chart. Selecting a preset (or a custom range) recomputes `startDate`/`endDate`, persists them to the URL, and refetches.

**Presets (recommended set):**

| Preset | Range (relative to today) | Default granularity |
|---|---|---|
| Last 7 days | today−6 … today | `date` |
| **Last 30 days** *(default)* | today−29 … today | `date` |
| Last 3 months | today−~90d … today | `date` |
| Last 12 months | today−365d … today | `month` |
| This month | 1st … today | `date` |
| This year | Jan 1 … today | `month` |
| Custom… | user-picked start & end | `date` |

The **default changes from "all history (date)" to "Last 30 days (date)"** — the single biggest readability win, and it makes the first paint fast.

**Granularity stays user-controllable.** The Date/Month buttons remain. Presets set a *sensible default* granularity (D4) but the user can still flip it. Long ranges therefore can't accidentally render 365 daily points unless the user explicitly asks for them.

### 3. URL state

`startDate`, `endDate`, and (optionally) the chosen `preset` join `groupBy` as URL query params, so a dashboard view is shareable/bookmarkable and survives SSR — consistent with the existing `?groupBy=` mechanism (`transactionStatisticListQuery.ts`).

---

## Confirmed Product Decisions

> Defaults chosen as a senior eng recommendation. Each is cheap to flip — they're called out so you can veto any before build. Open questions that genuinely need your call are in **Open Questions**.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | What kind of filter | **Quick presets *and* a custom start/end range.** | Presets cover ~95% of daily use in one tap; custom covers "show me March 2024 / tax season". |
| D2 | Default view on first load | **Last 30 days, grouped by `date`.** | Fixes the core complaint immediately; bounded + fast. Changes today's "all history" default — intended. |
| D3 | Keep `groupBy date \| month`? | **Yes, unchanged.** Range and granularity are orthogonal. | Minimal churn; range solves readability, granularity solves detail level. |
| D4 | Granularity when a preset is picked | **Preset sets a sensible default granularity (table above); user can override.** | Stops "Last 12 months" rendering 365 daily points by default, without taking away control. |
| D5 | `startDate`/`endDate` optionality | **Both optional & independent;** omitting both = all history (today's behavior). | Backward compatible; no breaking change to the contract or existing callers. |
| D6 | `endDate` boundary semantics | **Inclusive** in the contract; implemented as half-open (`< endDate + 1 day`) in SQL. | Intuitive for users ("through the 17th"); clean and DST/seconds-safe in SQL. |
| D7 | Ordering | **`ORDER BY MIN(created_at) ASC`** (real time, not the formatted string). | Fixes the zig-zag line and the `"01-2025" < "12-2024"` month bug. |
| D8 | Date format / timezone | `YYYY-MM-DD` strings; compare in the **server's existing timezone** (no tz handling added). | Matches how `created_at` is already stored/rendered; tz is out of scope (see Out of Scope). |
| D9 | Empty range result | Return `[]`; the chart shows an **empty/"no data in this range"** state, not an error. | A valid range with no transactions is normal, not a failure. |
| D10 | Invalid range (`startDate > endDate`, bad format) | **400 Bad Request** with a clear message; UI shows inline validation and doesn't fetch. | Fail fast, don't silently return misleading data. |
| D11 | Entity / chart shape | **Unchanged** (`{date,total,totalIncome}`; dual line+scatter). | Pure filtering feature; no schema/migration, no chart rewrite. |
| D12 | Backward compatibility | All contract changes **additive** (two optional query params). Existing `?groupBy=` flows untouched. | No migration, no consumer breakage. |

---

## Feature Requirements

### FR-1: Optional date-range filtering (backend)
`GET /transactions/statistics` accepts optional `startDate` and `endDate` (`YYYY-MM-DD`). Results are restricted to `created_at` within `[startDate, endDate]` inclusive. Omitting a bound leaves that side unbounded. `groupBy` behavior is unchanged. (D5, D6)

### FR-2: Deterministic chronological ordering (backend)
Statistics are returned ordered by real chronological time (`ORDER BY MIN(created_at) ASC`), for both `date` and `month` grouping — independent of this feature's range params. (D7)

### FR-3: Input validation (backend)
- Malformed dates → **400** (`"startDate must be YYYY-MM-DD"`).
- `startDate > endDate` → **400** (`"startDate must be on or before endDate"`).
- Both omitted → behaves exactly as today. (D10, D5)

### FR-4: Quick-preset selector (web)
A control offering the D1/D4 presets. Selecting one computes the concrete `startDate`/`endDate` **on the client** (relative to "today"), sets the preset's default granularity, persists all to the URL, and refetches. Default selection on first load = **Last 30 days**. (D2, D4)

### FR-5: Custom range picker (web)
A "Custom…" option exposing start & end date inputs. Applying a valid custom range fetches it; an invalid range (start after end, or incomplete) is blocked client-side with an inline message and no fetch. (D1, D10)

### FR-6: URL persistence & SSR
`startDate`, `endDate`, `preset`, and `groupBy` live in the URL query string. The web SSR prefetch (`apps/web/src/pages/index.tsx`) reads them so the first server-rendered paint already reflects the selected range. Reloading/sharing the URL reproduces the view. (consistent with existing `groupBy` URL handling)

### FR-7: Empty & error states (web)
- Valid range, no data → empty state ("No transactions in this range"), not the error view. (D9)
- Fetch/validation failure → existing `ErrorView` with retry. (D10)

### FR-8: Mobile parity
The React Native dashboard offers the same presets + custom range, reusing shared `libs/ui` primitives and the same usecase/repository plumbing. (existing mobile mounts the same `TransactionStatisticApp`)

### FR-9: Backward compatibility
With no range params, every existing caller (web, mobile, any bookmarked `?groupBy=` URL) behaves exactly as before. (D12)

---

## API Changes (all additive)

| Method | Path | Change |
|---|---|---|
| `GET` | `/transactions/statistics` | Add optional query params `startDate`, `endDate` (`string`, `YYYY-MM-DD`). Add `400` response for invalid input. Response schema **unchanged**. |

OpenAPI edit in `libs/api-contract/src/api.yaml:1528-1551`; Kubb regenerates the TS client. No breaking changes; **no DB migration** (filters on the existing indexed-ish `created_at`; consider an index only if profiling shows a need — see Risks).

---

## Out of Scope

- **New metrics / KPIs** (e.g. transaction count, average basket, top products) — this is purely a time-window filter on the existing two series.
- **Timezone handling / per-user locale** — comparisons use the server's current behavior (D8).
- **Comparison overlays** ("this period vs. previous period").
- **CSV / export** of the filtered data.
- **Chart-type changes** (bar/area), zoom/brush, or chart library swap.
- **DB schema migrations** beyond an optional `created_at` index if profiling demands it.
- **Server-side preset logic** — presets are computed client-side into concrete dates; the API only understands `startDate`/`endDate`.

---

## Open Questions

1. **Default range** — is **Last 30 days** the right landing view, or do you prefer Last 7 days / This month? (Trivial to change; affects first impression.)
2. **Preset list** — keep the seven in D1, or add/remove any (e.g. "Yesterday", "Last quarter", "All time")? An explicit **"All time"** preset is recommended so the old behavior stays one tap away.
3. **`created_at` index** — do you already have an index covering `created_at`? If 3 years is large enough that the bounded query is slow, we'd add one in Phase 1 (otherwise skip).

_Everything else is decided above and ready to build against._

---

# Part B — Implementation Plan

Companion to Part A. Phases are **independently shippable and ordered**; each is **one small PR**. Order: backend query → contract/codegen → frontend plumbing → web UI → mobile → docs. No DB migration. The entity/chart shape never changes.

**Design rules (from the PRD):**
- Range params are **optional & additive**; omitting them = today's behavior (D5, D12).
- `endDate` inclusive in the contract, half-open in SQL (D6).
- Order by real time, not the formatted string (D7) — fixes a pre-existing bug.
- Presets are **client-computed** into `startDate`/`endDate`; the API only knows dates (D1, FR-4).
- Granularity stays user-controllable; presets only set a default (D4).

---

## Phase 1: Backend — bounded + ordered statistics query

**Goal:** The endpoint filters by `startDate`/`endDate` and returns rows in true chronological order. Pure backend; reviewable in isolation against existing data (no params ⇒ identical output, except now correctly ordered).

**Changes**
- `apps/api/presentation/restapi/base_transformers.go`: add `GetStartDate(r)` / `GetEndDate(r)` parsers (reuse the `GetGroupBy` pattern, `:113-115`), returning parsed dates + a parse error.
- `apps/api/presentation/restapi/transaction_handler.go:170-187`: parse the two dates; on parse/validation error return **400** (FR-3); pass them into the usecase.
- `apps/api/domain/transaction_usecase.go:345-347`: extend `GetTransactionStatistics(ctx, groupBy, startDate, endDate)`; validate `startDate <= endDate` (FR-3) before hitting the repo.
- `apps/api/domain/transaction_repository.go:20`: update the interface signature.
- `apps/api/data/mysql/transaction_repo.go:193-208`: add the conditional `WHERE created_at >= ? ` / `< ? + 1 day` clauses and **`ORDER BY MIN(created_at) ASC`** (D7). Apply the same `WHERE` to the `GROUP BY`'d query; keep `deleted_at IS NULL`.
- `apps/api/data/mock/transaction_repository.go`: update the mock to the new signature.

**Tests**
- `apps/api/domain/transaction_usecase_test.go`: `startDate > endDate` → 400; both empty → delegates unchanged; valid range → forwarded to repo.
- Repo/handler tests (following `transaction_handler_test.go`): bounded range returns only in-range rows; results are chronologically ordered for both `date` and `month` (regression for D7 — assert `"12-2024"` precedes `"01-2025"`); inclusive `endDate` includes that whole day.

**Exit criteria:** `go test ./apps/api/...` green; no-param response is identical to today **but ordered**; range params correctly bound results.

---

## Phase 2: API contract + codegen

**Goal:** The generated TS client knows about `startDate`/`endDate`; both apps still compile (params optional, callers unchanged).

**Changes**
- `libs/api-contract/src/api.yaml:1528-1551`: add `startDate` and `endDate` query parameters (`type: string`, format note `YYYY-MM-DD`, optional) and a `400` response (`$ref: Error`). Response schema untouched.
- Run the Kubb codegen (per `openapitools.json` / `libs/api-contract/package.json`) to regenerate `transactionStatistics` + `transactionStatisticsQueryKey` with the new optional params.

**Tests / verify:** `nx build api-contract`, `nx build web`, `nx build mobile`, `nx test ui` green; generated `transactionStatistics` accepts optional `startDate`/`endDate`.

**Exit criteria:** Generated types include the new params; existing call sites compile with no change.

---

## Phase 3: Frontend data + domain plumbing (no new UI yet)

**Goal:** Thread an optional date range through the frontend clean-architecture layers and apply the **Last 30 days** default — shippable as a behavior change even before the fancy UI lands.

**Changes**
- `libs/ui/src/domain/entities/`: add a small `DateRange`/`StatisticPreset` type (e.g. `{ startDate: string | null; endDate: string | null }` + preset union). Entity `TransactionStatistic` stays as-is (D11).
- `libs/ui/src/domain/repositories/transaction.ts:56-62`: extend `getTransactionStatisticList` / `fetchTransactionStatisticList` to take `{ groupBy, startDate, endDate }`.
- `libs/ui/src/data/api/transaction.ts:34-57`: pass `startDate`/`endDate` into the generated `transactionStatistics(...)` call and the query key.
- `libs/ui/src/data/url/transactionStatisticListQuery.ts`: add get/set for `startDate`, `endDate`, `preset` (mirror the `groupBy` pattern); **default preset = Last 30 days** (D2) with a shared "preset → concrete dates" helper (client-side, FR-4) so SSR and client agree.
- `libs/ui/src/domain/usecases/transactionStatisticList.ts`: add `startDate`/`endDate`/`preset` to `Context` + params; add a `SET_DATE_RANGE` action that, like `SET_GROUP_BY` (`:96-101`), transitions to `loading` and refetches with the new range; persist via the URL repo in `onStateChange`.
- `apps/web/src/pages/index.tsx:11-38`: read range/preset from the URL and prefetch the bounded data server-side (FR-6).
- Update mocks: `libs/ui/src/data/mock/transactionStatisticListQuery.ts`, `libs/ui/src/data/mock/transaction.ts`.

**Tests:** extend `libs/ui/src/domain/usecases/transactionStatisticList.test.ts` — `SET_DATE_RANGE` → loading → refetch with correct range; default range = Last 30 days; preset→dates helper unit-tested (incl. month boundaries, "This year").

**Exit criteria:** Dashboard now defaults to Last 30 days end to end (web SSR + client); existing tests pass; no visible new control yet (or a temporary minimal one), so the PR stays small.

---

## Phase 4: Web UI — preset selector + custom range picker

**Goal:** Operators can pick a preset or a custom range (FR-4, FR-5, FR-7).

**Changes**
- `libs/ui/src/presentation/components/transactions/TransactionStatistic.tsx:25-126`: add a **range control** above the existing Group By buttons (`:38-55`) — preset chips/segmented control + a "Custom…" option revealing start/end inputs (Tamagui primitives). Wire `onDateRangeChange`. Keep the Date/Month buttons.
- `TransactionStatisticScreen.tsx` + `TransactionStatisticHandler.tsx`: extend props (`onDateRangeChange`, current `startDate`/`endDate`/`preset`) and map the new usecase state through.
- Add the **empty state** ("No transactions in this range") when `loaded` but data is empty (D9, FR-7); keep `ErrorView` for failures.
- Inline validation for custom ranges (start ≤ end, both set) before dispatch (FR-5/D10).
- Update `*.stories.tsx` for the new states (preset selected, custom range, empty).

**Verify:** `nx serve web` — Last 30 days on load; switch presets → chart rebounds and URL updates; pick a custom month → only that window shows; empty range → empty state; bad custom range → blocked. `nx test web` / `nx test ui`.

**Exit criteria:** All FR-4/FR-5/FR-7 cases reproduce in the web dashboard; Group By still works.

---

## Phase 5: Mobile parity

**Goal:** Same presets + custom range on React Native (FR-8).

**Changes**
- `apps/mobile/src/app/App.tsx`: the dashboard already mounts `TransactionStatisticApp`; supply initial range params (default Last 30 days) consistent with web.
- Reuse the shared `libs/ui` range control; substitute mobile-appropriate date input if the web picker isn't RN-compatible, keeping the same usecase/repository contract.

**Verify:** `nx test mobile`; on emulator, walk the same preset/custom/empty cases.

**Exit criteria:** Mobile operators get the bounded dashboard with presets + custom range and correct totals.

---

## Phase 6: Documentation + release

1. Short owner guide under `docs/`: "Dashboard date filter — presets vs. custom range, and how granularity interacts."
2. Update `E2E_TEST_PLAN.md` with range/preset/empty-state scenarios.
3. Update `README.md` feature list if it mentions the dashboard.
4. Each PR description links this doc and lists the FR cases verified.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Changing the default to "Last 30 days" surprises users expecting all history | Medium | Low | Documented (D2); add an explicit **"All time"** preset (Open Q2) so prior behavior is one tap away. |
| Bounded query slow on 3 yrs of data without a `created_at` index | Low–Med | Medium | Profile in Phase 1; add an index migration only if needed (Open Q3). Range filter *reduces* scanned rows vs. today. |
| `endDate` off-by-one (inclusive vs. exclusive) | Medium | Medium | Half-open `< endDate + 1 day` in SQL with an explicit inclusive-boundary test (D6, FR-2 tests). |
| Month ordering bug persists if sorted by string | Medium | Medium | `ORDER BY MIN(created_at)`, with a regression test asserting cross-year month order (D7). |
| SSR (server "today") vs. client "today" drift for relative presets | Low | Low | Compute concrete `startDate`/`endDate` once via the shared helper and persist to the URL; SSR reads the URL, not a fresh "now" (FR-6). |
| Timezone mismatches near midnight | Low | Low | Out of scope (D8); documented. Revisit only if operators report boundary issues. |
| Long custom range + `date` granularity reproduces the unreadable chart | Low | Low | Presets default to `month` for long windows (D4); custom-range long windows are an explicit user choice. |

---

## Estimated Sequence

| Phase | Est. effort | Blocks |
|---|---|---|
| 1 Backend query (range + ordering) | 1 day | 2 |
| 2 Contract + codegen | 0.5 day | 3 |
| 3 Frontend plumbing + default range | 1 day | 4 |
| 4 Web UI (presets + custom + empty) | 1.5 days | 5 |
| 5 Mobile parity | 1 day | 6 |
| 6 Docs + release | 0.5 day | — |

**Total:** ~5.5 working days, single engineer. Each phase is one reviewable PR; Phases 1–3 already deliver the core win (bounded, ordered, Last-30-days default) before the polished UI lands.
