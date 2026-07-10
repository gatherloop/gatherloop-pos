# PRD: Cash Flow Management — Expense Categories with Target vs. Actual Variance

> **Revision note:** v1 of this PRD proposed keeping budget envelopes and adding explicit budget transfers. After reviewing complexity (new `budget_transfers` table, transfer UI, a food-cost flag with uniqueness problems) against how the industry actually handles this, v2 supersedes it with a simpler design that removes the envelope mechanics instead of patching them. See "Alternatives Considered" for the comparison.

## Problem Statement

Today the cash flow pipeline works like this:

1. **Payment**: When a transaction is paid, the transaction total lands in the chosen payment wallet (minus the wallet's payment cost).
2. **Allocation**: The net income is split across budgets by percentage; the food cost portion is credited to the **Restock** budget, identified by a hard-coded `restockBudgetId = 4` (`PayTransaction` in `apps/api/domain/transaction_usecase.go`).
3. **Spending**: When an expense is created, the operator picks a budget, and the expense total is deducted from **both** the budget balance and the wallet balance. If the budget balance is insufficient, the API **hard-rejects** the expense (`"budget's balance insufficient"` in `apps/api/domain/expense_usecase.go`).

The failure mode: the Restock budget frequently doesn't cover a real-world food material purchase (the same happens with Operational). Since the expense *must* be booked, the operator books it against a budget that still has balance — usually **Profit**. The purchase goes through, but now:

- **Expense statistics are wrong.** A food material purchase is recorded as a "Profit" expense. `GET /expenses/statistics` groups by `budget_id`, so the Restock category is understated and Profit is overstated.
- **The workaround is invisible.** Nobody can see how often Restock ran dry or which budget silently absorbed the shortfall — so there is no signal to tune the percentages.
- **Budget balances stop meaning anything.** A budget's balance answers neither "how much have we really spent on this?" nor "how much can we still spend on this?".

### Root cause

The single field `expense.budget_id` carries two independent meanings:

1. **Classification** — *what kind of spend is this?* (what statistics need; must always be truthful)
2. **Funding** — *which envelope pays for it?* (what the hard balance check enforces)

When the true envelope is empty, funding wins and classification is falsified. The v1 fix kept both meanings and added transfer machinery to reconcile them. The v2 fix **removes the funding meaning entirely** — the budget becomes a pure classification (an expense category), and spending control moves to where the industry puts it: measurement and real-money segregation.

---

## How the Industry Handles This

Research summary (sources at the bottom):

1. **Mainstream POS systems don't do envelope budgeting.** Square, Toast, Lightspeed, etc. record sales; expenses are recorded against a **chart of expense categories** and budgeting means a *target per category per period*, reviewed via a **budget vs. actual variance report**. Nothing blocks a purchase; no balance is mutated per transaction.
2. **Restaurant platforms manage food cost with target percentages.** Restaurant365, MarginEdge, Toast guidance: set a target (food cost 28–32% of sales is the standard benchmark), compute the actual percentage from real data, review variance frequently. Control comes from *fast feedback*, not blocking — variance under 2% is healthy, above 5% signals a systemic problem.
3. **The envelope model exists ("Profit First") but uses real bank accounts.** Revenue is allocated by percentage into *separate physical accounts* on a schedule (typically twice a month), not per transaction. When the OpEx account is empty you stop spending or make an explicit bank transfer. Discipline comes from money being physically elsewhere.

The current system is a per-transaction virtual Profit First — the most complex possible variant. The industry pattern is: **truthful categories + variance reporting + real-money segregation**. All three are achievable here mostly by *deleting* code — the system already has wallets, wallet transfers, a wallet balance check on expenses, and both expense and transaction statistics endpoints.

---

## Alternatives Considered

### Option A — Envelope budgets + explicit budget transfers (PRD v1) ❌

Keep mutating budget balances, add a `budget_transfers` table/API/UI so shortfalls are resolved by explicit reallocation, and a flag to replace the hard-coded Restock id.

- ✅ Truthful statistics, preserved envelope discipline.
- ❌ Significant new machinery: transfer endpoints, transfer screens, inline top-up UX in the expense form.
- ❌ The food-cost flag has no clean uniqueness guarantee (MySQL can't declare "at most one row flagged"; needs usecase-level validation, and "two budgets flagged" remains a reachable misconfiguration).
- ❌ Keeps per-transaction allocation math and its pay/unpay symmetry burden.
- ❌ Ongoing operational friction: every shortfall requires a transfer before the expense can be booked.

### Option B — Two taxonomies (category for stats, budget for funding) ❌

- ❌ Two nearly identical lists to maintain; the misclassification incentive just moves.

### Option C — Expense categories + target vs. actual variance + real-money savings ✅ **Recommended**

Budgets become pure **expense categories**. Balance mechanics and per-transaction allocation are removed. Discipline is provided by (a) a target-vs-actual variance report and (b) physically moving savings/salary money to a dedicated wallet using the **existing** wallet-transfer feature.

- ✅ Statistics always truthful — there is no longer any reason to misclassify.
- ✅ Net code **deletion**: the allocation loop in `PayTransaction`/`UnpayTransaction` (including `restockBudgetId = 4`), the budget balance checks/mutations in the expense flow, and the `balance` column all go away. No new tables, no new endpoints.
- ✅ Savings protection is *stronger* than a virtual envelope: money in the Savings wallet is excluded from spendable balance by the existing wallet check in the expense flow.
- ⚠ Trade-off: no per-expense "is there envelope money for this category?" gate. Accepted deliberately — that gate is what corrupts the data today, and the industry consensus is that measurement + segregation beats virtual blocking for small operations.

---

## Proposed Solution

### Concept mapping

| Today | After |
|---|---|
| Budget = envelope with `Percentage` (income allocation) + mutating `Balance` | **Expense category** with `Percentage` = *spending target as % of revenue* for a period |
| Pay/unpay transaction mutates every budget balance | Pay/unpay only touches the wallet and `TotalIncome` (unchanged) |
| Expense checks & deducts budget balance + wallet balance | Expense checks & deducts **wallet balance only**; `budget_id` is pure classification |
| Discipline = hard rejection when envelope is empty | Discipline = variance report (target vs. actual % of revenue) + real money moved to a Savings wallet |
| Restock budget special-cased by hard-coded id 4 (backend **and** `BudgetListItem.tsx` frontend) | No special case — Restock is a category with a target like any other |

### FR-1: Decouple expenses from budget balances

Remove the budget balance check and mutation from expense create, update, and delete (`apps/api/domain/expense_usecase.go`). The wallet balance check and mutation stay exactly as they are.

**Rules:**
- `budget_id` remains **required** on expenses — every expense must be classified.
- The referenced budget must exist and not be soft-deleted (validation that today happens implicitly via `GetBudgetById` is kept explicitly).
- `"budget's balance insufficient"` rejection is removed; `"wallet's balance insufficient"` stays.
- Expense statistics endpoint and grouping are unchanged.

### FR-2: Remove income allocation from transaction pay/unpay

Delete the budget loop from `PayTransaction` and `UnpayTransaction` (`apps/api/domain/transaction_usecase.go`), including the hard-coded `restockBudgetId = 4`.

**Rules:**
- Wallet credit/debit, payment cost, and `TotalIncome` computation are **unchanged** — only the budget balance writes are removed.
- Unpay symmetry: a transaction paid before this change and unpaid after it will not reverse the old budget allocation. Accepted: budget balances are being retired (FR-3), so stale balances are harmless in the interim and deleted at cleanup.

### FR-3: Budgets become expense categories with a spending target

Retire the `balance` column; redefine `percentage` as a **spending target expressed as % of revenue** for any reporting period.

**Rules:**
- Migration drops `budgets.balance`; entity, MySQL layer, API contract (`api.yaml`), transformers, and frontend types drop the field.
- `percentage` keeps its name in the schema/API (avoids a breaking rename) but its documented meaning becomes *"target spend for this category as a percentage of revenue over the reporting period; 0 = no target"*.
- Targets are **not required to sum to 100**. The remainder is the implied target profit margin, and the variance report shows it as an "Unspent / Profit" line.
- Operators must re-tune values after rollout (old values meant *share of allocated income*, e.g. Operational 60/Marketing 20/Savings 20; new values mean *% of revenue*, e.g. Restock 30, Operational 25, Salary 20, Savings 10). This is a one-time manual step, called out in the rollout notes.
- Seeder (`apps/api/seeds/budget_seeder.go`) updated to seed categories with revenue-share targets, including a **Restock** category (fixing the current oddity that the seeder creates only 3 budgets while the code special-cases id 4).

### FR-4: Target vs. actual variance report

Extend the Expense Statistics screen with a per-category comparison for the selected period.

**Rules:**
- **Actual %** = category expense total ÷ total revenue for the period. Revenue comes from the existing `GET /transactions/statistics`; category spend from the existing `GET /expenses/statistics`. **Frontend-only** — no backend change (`transactionStatisticList` and `expenseStatisticList` usecases already exist in `libs/ui`).
- **Target %** = the category's `percentage`; categories with target 0 show "—" instead of a variance.
- Per-category row: target %, actual %, delta — with the delta highlighted when actual exceeds target (this is the "am I overspending Restock?" signal).
- An "Unspent / Profit" summary line: 100% − Σ actual %, so under-saving is visible at a glance.
- Zero-revenue periods show actuals as absolute amounts only (no percentages), never divide-by-zero.

### FR-5: Category management UI + relabeling

Make categories manageable without engineering help, and align the language.

**Rules:**
- Add create/update forms for categories (name + target %) — the backend CRUD (`POST/PUT /budgets`) already exists; only the frontend screens are new (mirror the `WalletCreateScreen`/`WalletUpdateScreen` pattern).
- Relabel "Budget" → "Expense Category" across UI labels, sidebar, and screen titles. Backend/API names keep `budget` (see Out of Scope).
- `BudgetListItem.tsx` stops showing `balance` (field is gone) and drops its own hard-coded `id === 4` special case; rows show name + target %.
- Expense form label changes from "Budget" to "Category"; behavior already correct after FR-1.

### Operational practice (no code): protect savings with a real wallet

Recreate the discipline the envelopes were meant to provide, the Profit First way — with real money and **existing features**:

- Create a **Savings** wallet (and optionally **Salary**), with the existing `is_payment_target = false` so it never appears in the checkout payment modal.
- On a schedule (e.g. 1st and 16th), use the existing **wallet transfer** feature to move the savings/salary portion of revenue out of the operational wallets.
- Because the expense flow already blocks on wallet balance, money moved to the Savings wallet is physically excluded from day-to-day spending — a stronger guarantee than any virtual budget number.
- Optional: seed a Savings wallet in `wallet_seeder.go` so fresh environments demonstrate the practice.

---

## Out of Scope

- **Budget transfers, food-cost flags, envelope top-up UX** — the v1 design, superseded by this revision.
- **Renaming `budget` → `expense_category` in the database, API paths, and Go/TS identifiers.** A cosmetic but wide-reaching breaking change (migrations, `api.yaml` paths/schemas, regenerated clients, every layer of both apps). UI labels change now (FR-5); the identifier rename can be a standalone follow-up if the naming debt ever hurts.
- **Reclassifying historical expenses.** Past misclassified expenses can be corrected one-by-one via the existing expense update flow. A bulk tool is not part of this PRD.
- **Automated/scheduled wallet transfers for savings.** The twice-monthly savings sweep stays a manual operational practice for now; automating it is a possible future feature.
- **Variance alerts (push/email when a category crosses its target).** The report is pull-based; alerting can layer on later.
- **Changing revenue recognition, payment cost, or `TotalIncome` computation.** Untouched.

## Open Questions

1. **Target denominator.** This PRD defines targets as % of *revenue* (industry convention: "food cost 28–32% of sales"). The alternative — % of *total expenses* — makes targets sum to 100 but hides the profit margin. Recommendation: % of revenue.
2. **Should `percentage` be renamed to `target_percentage` in the API contract?** More honest naming, but a breaking contract change. Recommendation: keep the name, update the description in `api.yaml`; fold a rename into the future full-rename follow-up if it happens.

---

# Implementation Plan — Phased PRs

Each phase is one small, independently reviewable PR. Every phase leaves the system consistent and shippable.

```
Phase 1 (FE: variance report)          — frontend-only, works against current data
Phase 2 (BE: decouple expense flow)    — stops forced misclassification immediately
Phase 3 (BE: remove pay/unpay allocation)
Phase 4 (BE+FE: drop balance, retarget percentage, seeders)
Phase 5 (FE: category management UI + relabel)
```

Phases 2 and 3 are independent of Phase 1. Phase 4 depends on 2 + 3 (balances must no longer be written before the column is dropped). Phase 5 depends on 4.

---

### Phase 1 — Frontend: target vs. actual variance report (FR-4)

**Goal:** the feedback loop ships first and works against current data (statistics get *more* truthful as later phases land).

- `ExpenseStatisticHandler.tsx`: also consume the existing `transactionStatisticList` usecase for period revenue; compute per-category actual % and delta vs. `budget.percentage` (via `budgetList` usecase).
- New presentational component (e.g. `ExpenseVarianceList`) rendering per-category rows (target / actual / delta, over-target highlighted) + the "Unspent / Profit" line; embed in `ExpenseStatisticScreen` alongside the existing chart.
- Edge cases: zero revenue (absolute amounts, no %), target 0 ("—"), categories with expenses but no target and vice versa.
- Stories + handler tests for the share computation and edge cases.

**Acceptance:** for any date range, each category shows target %, actual % of revenue, and delta; over-target categories are visually flagged.
**Estimated diff:** ~250–350 LoC. No backend change.

---

### Phase 2 — Backend: decouple expenses from budget balances (FR-1)

**Goal:** remove the mechanism that forces misclassification. Smallest, highest-value change.

- `expense_usecase.go`: in create/update/delete, remove budget balance reads/writes and the `"budget's balance insufficient"` rejection; keep an existence/soft-delete check on `budget_id`; wallet logic untouched.
- Update `expense_usecase_test.go` (drop insufficient-budget cases, add invalid-budget-id case) and any handler tests asserting the old error.

**Acceptance:** an expense larger than its category's old "balance" is accepted (wallet balance permitting) and appears under its true category in statistics; wallet insufficiency still rejects.
**Estimated diff:** ~100–150 LoC, mostly deletions.

---

### Phase 3 — Backend: remove income allocation from pay/unpay (FR-2)

**Goal:** delete the per-transaction envelope math and the hard-coded Restock id.

- `transaction_usecase.go`: remove the budget list loop from `PayTransaction` and `UnpayTransaction` (including `restockBudgetId = 4`); drop the now-unused `budgetRepository` dependency from the usecase constructor and wiring.
- Update `transaction_usecase_test.go` (remove allocation assertions; keep wallet, payment-cost, and `TotalIncome` assertions).
- Rollout note in the PR description: transactions paid before deploy and unpaid after will leave stale budget balances — harmless, deleted in Phase 4.

**Acceptance:** pay/unpay affect only the wallet and the transaction record; `TotalIncome` unchanged; no budget rows are written.
**Estimated diff:** ~150–200 LoC, mostly deletions.

---

### Phase 4 — Backend + contract: retire `balance`, retarget `percentage` (FR-3)

**Goal:** make the schema match the new semantics.

- Migration `000018_drop_budget_balance.up.sql` / `.down.sql`: drop `budgets.balance` (down restores it with `DEFAULT 0`).
- Remove `Balance` from `budget_entity.go` (domain + MySQL), transformers, mock repository, and the `Budget` schema in `libs/api-contract/src/api.yaml` (update the `percentage` description to the new target semantics); regenerate clients.
- Frontend: remove `balance` from the `Budget` entity/transformer/mocks; `BudgetListItem.tsx` shows name + target % (drop the balance subtitle **and** the hard-coded `id === 4` case).
- Seeder: categories with revenue-share targets incl. Restock (e.g. Restock 30, Operational 25, Salary 20, Savings 10); optionally seed a `Savings` wallet with `is_payment_target = false`.
- Rollout note: operators re-tune target values post-deploy (old values were income-allocation shares).

**Acceptance:** API no longer returns `balance`; budget list renders name + target; migration up/down clean; fresh seed demonstrates the new model.
**Estimated diff:** ~250–350 LoC across backend, contract, and frontend types/display.
**Dependency:** Phases 2 and 3 merged (nothing may write `balance` anymore).

---

### Phase 5 — Frontend: category management UI + relabel (FR-5)

**Goal:** categories manageable in-app; language matches the concept.

- New `BudgetCreateScreen`/`Handler` and `BudgetUpdateScreen`/`Handler` + `BudgetFormView` (name, target %) wired to the existing `POST/PUT /budgets` endpoints — mirror the wallet form suite; add `budgetCreate`/`budgetUpdate` usecases in `libs/ui/src/domain` (mirror `walletCreate`).
- Routes in web + mobile apps; "New Category" / edit actions on the list screen.
- Relabel "Budget" → "Expense Category" in sidebar, screen titles, and the expense form's picker label.
- Stories + handler tests (form validation: name required, target 0–100).

**Acceptance:** a user can create/edit categories with a target; all "Budget" labels read "Expense Category"; expense creation flow unchanged functionally.
**Estimated diff:** ~400–550 LoC, heavily copy-adapted from wallet screens.
**Dependency:** Phase 4 (form schema must not include `balance`).

---

## Rollout Notes

1. After Phase 4, **re-tune targets**: old percentages were income-allocation shares; set new values as % of revenue per category (leave 0 for "no target").
2. Adopt the **savings sweep**: create the Savings wallet (non-payment-target) and schedule the twice-monthly wallet transfer as an operational routine.
3. Existing budget `balance` values are discarded at Phase 4 — they are already meaningless due to historical misclassification; no data migration is attempted.
4. Historical expense statistics retain their misclassified categories; optionally correct important months via the expense update flow.

## Success Criteria (post-rollout)

1. **Statistics are truthful:** food purchases always appear under Restock, even in heavy-spend months — there is no mechanism that rejects a truthfully classified expense.
2. **Overspending is visible within a week:** the variance report shows actual vs. target % of revenue per category for any period.
3. **Savings actually accumulate:** the Savings wallet balance grows monotonically except for deliberate, visible wallet transfers out.
4. **Less code:** envelope allocation, budget balance checks, and both hard-coded `id = 4` special cases are gone; no new tables or endpoints were added.

## Sources

- [Restaurant365 — food cost guide (28–32% benchmark)](https://www.restaurant365.com/blog/food-cost-guide/)
- [Toast — food cost variance](https://pos.toasttab.com/blog/on-the-line/food-cost-variance)
- [MarginEdge — actual vs. theoretical food costs](https://www.marginedge.com/blog/a-restaurant-operators-guide-to-actual-vs-theoretical-food-costs-and-usage)
- [SVA — integrating POS with accounting software](https://accountants.sva.com/biz-tips/integrating-pos-systems-with-restaurant-accounting-software)
- [RASI — categorizing restaurant expenses](https://rasiusa.com/blog/how-do-you-categorize-restaurant-expenses/)
- [Cash Flow Frog — budget vs. actual variance analysis](https://cashflowfrog.com/blog/actuals-vs-budget-a-guide-to-budget-variance-analysis/)
- [Relay — Profit First method guide](https://relayfi.com/blog/profit-first-method/)
- [Mercury — using the Profit First method](https://mercury.com/blog/how-to-use-profit-first-method)
