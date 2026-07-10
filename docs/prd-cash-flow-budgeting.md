# PRD: Cash Flow Budgeting — Truthful Expense Classification with Explicit Budget Transfers

## Problem Statement

Today the cash flow pipeline works like this:

1. **Payment**: When a transaction is paid, the transaction total lands in the chosen payment wallet (minus the wallet's payment cost).
2. **Allocation**: The net income is split across budgets by percentage; the food cost portion is credited to the **Restock** budget (`PayTransaction` in `apps/api/domain/transaction_usecase.go`).
3. **Spending**: When an expense is created, the operator picks a budget, and the expense total is deducted from **both** the budget balance and the wallet balance. If the budget balance is insufficient, the API **hard-rejects** the expense (`"budget's balance insufficient"` in `apps/api/domain/expense_usecase.go`).

The failure mode: the Restock budget frequently doesn't cover a real-world food material purchase (the same happens with Operational). Since the expense *must* be booked, the operator books it against a budget that still has balance — usually **Profit**. The purchase goes through, but now:

- **Expense statistics are wrong.** A food material purchase is recorded as a "Profit" expense. `GET /expenses/statistics` groups by `budget_id`, so the Restock category is understated and Profit is overstated. Over time the statistics stop reflecting reality at all.
- **The workaround is invisible.** Nobody can see how often Restock ran dry, by how much, or which budget silently absorbed the shortfall. There is no signal to tune the allocation percentages.
- **Budget balances stop meaning anything.** A budget's balance no longer answers "how much have we really spent on this?" nor "how much can we still spend on this?".

### The dilemma we're resolving

Two candidate directions were considered, each with a known flaw:

- **Keep hard budgets (status quo)** → operators misclassify expenses when an envelope runs dry → statistics are corrupted.
- **Drop budgets, use only "expense categories"** → statistics become truthful, but nothing prevents overspending one category (e.g. Restock) and under-saving another (e.g. Salary/Savings) — the exact discipline budgets were introduced to provide.

This PRD proposes a third direction that keeps the strengths of both.

---

## Root Cause Analysis

The single field `expense.budget_id` carries **two independent meanings**:

1. **Classification** — *what kind of spend is this?* This is what statistics, reporting, and cost analysis need. It must always be truthful.
2. **Funding** — *which envelope pays for it?* This is what the balance check enforces.

When the true envelope is empty, funding wins and classification is falsified. Any correct solution must guarantee that **classification is never sacrificed to satisfy funding**.

Envelope budgeting systems (e.g. YNAB's "roll with the punches") solve this exact problem the same way: when an envelope runs dry, you **explicitly move money between envelopes**, then book the expense in its true category. The expense record stays honest; the reallocation decision becomes a visible, auditable event instead of a hidden misclassification.

---

## Options Considered

### Option A — Remove budgets; classify expenses with "expense category" only

Expenses get a category; statistics group by category; no balance checks.

- ✅ Statistics always truthful; no friction at expense time.
- ❌ No forward-looking control: nothing stops Restock from consuming the Salary allocation. Overspending is only discovered *after* the fact in a percentage report.
- ❌ Loses the "how much can I still spend?" answer entirely.

### Option B — Keep budgets for funding, add a separate category for classification

Each expense records both a `category_id` (truth for stats) and a `budget_id` (envelope that funds it).

- ✅ Statistics truthful even when funding is borrowed.
- ❌ Two parallel taxonomies to create, name, and maintain — they would be nearly identical lists (Restock, Operational, Salary, …), inviting drift and confusion.
- ❌ The interesting fact — "Restock was short and Profit covered it" — is buried inside individual expense rows rather than being a first-class event.

### Option C — Keep budgets as the single taxonomy; add explicit budget transfers ✅ **Recommended**

The budget **is** the category (they are already 1:1 in practice). Fix the borrowing problem directly:

1. **Budget transfers**: a first-class, audited operation that moves balance from one budget to another (mirroring the existing wallet transfers). Raiding Profit to fund a Restock purchase becomes a deliberate, recorded event.
2. **Expense flow keeps the hard balance check**, but the UI shows the selected budget's remaining balance up front and, on shortfall, offers an inline "cover the shortfall from another budget" step — so the easy path is the honest path.
3. **Reporting**: budgets gain a transfer history, and statistics gain a "target allocation % vs. actual spend %" comparison so the operator can see which envelopes chronically run dry and re-tune the percentages.

- ✅ Statistics truthful: every expense is booked against its real budget, always.
- ✅ Savings discipline preserved: the Savings/Salary envelope only shrinks via an explicit transfer someone chose to make — and the system can show exactly how often that happened.
- ✅ Generates the data needed to fix the *underlying* problem (mis-tuned percentages).
- ✅ Smallest change surface: statistics code, expense entity, and allocation logic are all untouched; the wallet-transfer feature is directly reusable prior art.

---

## Context: Existing System

- **Backend**: Go REST API + MySQL, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations` (numbered, `.up.sql`/`.down.sql` pairs; next number: `000018`).
- **Frontend**: Next.js web + React Native mobile sharing `libs/ui` (Tamagui). API types generated from `libs/api-contract/src/api.yaml`.
- **Budget entity** (`apps/api/domain/budget_entity.go`): `Id`, `Name`, `Percentage`, `Balance`, `CreatedAt`, `DeletedAt`. Full CRUD exists but the UI only exposes a read-only list (`BudgetListScreen`).
- **Income allocation** (`transaction_usecase.go`, `PayTransaction`/`UnpayTransaction`): food cost → the Restock budget, identified by a **hard-coded `restockBudgetId = 4`**; remaining income × `Percentage/100` → every other budget.
- **Expense flow** (`expense_usecase.go`): create/update/delete run in a DB transaction that adjusts both budget and wallet balances, hard-rejecting on insufficient budget or wallet balance.
- **Expense statistics** (`expense_repo.go`, `GetExpenseStatistics`): `SUM(total)` grouped by date × `budget_id`.
- **Wallet transfers — the prior art to mirror**: `WalletTransfer` entity, `wallet_transfers` table, `GET/POST /wallets/{walletId}/transfers`, `CreateWalletTransfer` usecase (balance check + double update + record insert in one transaction), and a complete frontend suite (`WalletTransferListScreen`, `WalletTransferCreateScreen`, `WalletTransferFormView`, etc.).

---

## Proposed Solution

Keep the budget concept and its allocation-on-payment behaviour unchanged. Add three capabilities:

### FR-1: Budget Transfers

A new operation that moves an amount from one budget's balance to another's.

**Rules:**
- `POST /budgets/{budgetId}/transfers` with body `{ amount, toBudgetId }`; `GET /budgets/{budgetId}/transfers` lists transfers where the budget is sender **or** receiver (mirroring wallet transfers).
- Amount must be `> 0`; `toBudgetId` must differ from the source budget; both budgets must exist and not be soft-deleted.
- The source budget must have sufficient balance — transfers cannot drive a budget negative (same rule as wallet transfers).
- The whole operation (debit, credit, record insert) runs in a single DB transaction.
- Transfers are **budget-only**: wallet balances are untouched. Budgets are virtual envelopes layered over the combined wallet balance, so moving money between envelopes has no effect on any wallet.
- Transfer records are immutable history: no update endpoint. (Deletion/reversal is out of scope; a mistaken transfer is corrected by making the opposite transfer.)

**New table `budget_transfers`:**

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK AUTO_INCREMENT | |
| `from_budget_id` | BIGINT NOT NULL, FK → budgets | |
| `to_budget_id` | BIGINT NOT NULL, FK → budgets | |
| `amount` | DECIMAL/FLOAT (match `wallet_transfers.amount`) | > 0 |
| `note` | VARCHAR(255) NULL | optional reason, e.g. "Restock shortfall for Friday market run" |
| `created_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft-delete column for consistency; unused by the API |

### FR-2: Budget management & transfer UI

The Budget list screen becomes actionable instead of read-only.

**Rules:**
- Each budget row gets a **"Transfers"** action → transfer history screen for that budget (mirrors `WalletTransferListScreen`), showing direction (in/out), counterpart budget, amount, note, and date.
- A **"New Transfer"** action opens a form (mirrors `WalletTransferFormView`): source budget (pre-filled from the row), destination budget select, amount, optional note. Client-side validation mirrors the API rules; the source budget's current balance is displayed next to the amount field.
- Budget list rows show `Balance` prominently (already present) — no layout redesign required.

### FR-3: Expense form — budget visibility and inline shortfall resolution

Make the honest path the easy path at the moment of expense entry.

**Rules:**
- The budget select in `ExpenseFormView` displays each budget's **remaining balance** alongside its name (e.g. "Restock — Rp 125.000").
- While the form total exceeds the selected budget's balance, show an inline warning: *"Restock balance (Rp 125.000) is not enough for this expense (Rp 180.000). Transfer Rp 55.000 from another budget to proceed."* — with a **"Top up from…"** button.
- "Top up from…" opens the budget-transfer form (from FR-2) pre-filled: destination = the selected budget, amount = the shortfall. On success the expense form refreshes budget balances and the warning clears.
- The API keeps its hard rejection. The frontend never silently re-routes an expense to a different budget — the user either transfers funds or consciously picks a different budget.

### FR-4: Replace the hard-coded Restock budget id with a flag

`restockBudgetId = 4` in `transaction_usecase.go` is fragile (the seeder doesn't even create four budgets) and blocks any environment where Restock has a different id.

**Rules:**
- Add `is_food_cost_target TINYINT(1) NOT NULL DEFAULT 0` to `budgets` (name open — see Open Questions). Exactly one budget is expected to have it set; `PayTransaction`/`UnpayTransaction` route the food cost to the flagged budget instead of id 4.
- Migration backfills `is_food_cost_target = 1` on budget id 4 **if it exists**, preserving current production behaviour.
- If no budget is flagged, the food cost is allocated like ordinary income (percentage split) rather than erroring — paying a transaction must never fail because of budget misconfiguration.
- Seeder updated to include a Restock budget with the flag set.
- Expose the flag on the budget API schema (read-only in UI for now; managed via seeding/DB).

### FR-5: Allocation target vs. actual spend report

Give the operator the feedback loop to re-tune percentages instead of perpetually transferring.

**Rules:**
- On the Expense Statistics screen, add a per-budget comparison for the selected period: **target share** (the budget's `Percentage`) vs. **actual share** (that budget's expense total ÷ all budgets' expense total).
- Computable entirely on the frontend from existing endpoints (`GET /budgets` + `GET /expenses/statistics`) — no backend change.
- Visual: simple paired bars or a delta badge per budget (e.g. "Restock: target 30% · actual 42% · **+12%**"), highlighting budgets that chronically overshoot.
- The Restock budget's "target" is nominal (its income comes from food cost, not percentage) — label it accordingly rather than hiding it.

---

## Out of Scope

- **Reclassifying historical expenses.** Past expenses booked against the wrong budget can already be corrected one-by-one via the existing expense update flow (which refunds and re-deducts balances). A bulk reclassification tool is not part of this PRD.
- **Removing or renaming the budget concept.** Budgets remain; no "expense category" entity is introduced (see Option B rejection).
- **Automatic transfers / auto-borrow.** The system never moves money between budgets on its own; every transfer is a human decision. This is deliberate — automation would recreate the invisible-borrowing problem with extra steps.
- **Budget transfer deletion or editing.** Corrections are made with an opposite transfer, keeping history append-only.
- **Changing the income allocation formula** (percentages, food-cost routing, payment cost). Only the *identification* of the Restock budget changes (FR-4), not the math.
- **Negative-balance / overdraft mode.** Considered as an alternative to hard rejection (book the expense truthfully, let the budget go negative, show it in red). Rejected for now: it weakens the discipline guarantee and complicates every balance display. Transfers achieve the same honesty with an explicit decision point. Can be revisited if transfer friction proves too high.
- **Multi-budget funding of a single expense.** An expense is always funded by exactly one budget; shortfalls are resolved by transferring first.

---

## Open Questions

1. **Flag naming (FR-4).** `is_food_cost_target` is descriptive; alternatives: `kind ENUM('percentage','food_cost')` if we anticipate more allocation kinds. Recommendation: the boolean — YAGNI until a third kind appears.
2. **Transfer note field.** Optional in this PRD. If the team wants transfers to double as an audit trail of "why we raided savings," consider making `note` required for transfers **out of** the Savings budget specifically. Recommendation: keep optional; revisit after observing usage.
3. **Who can transfer?** No RBAC exists (any authenticated crew member can do anything), consistent with the rest of the system. Flagged for the future: budget transfers are exactly the kind of operation RBAC would eventually gate.

---

# Implementation Plan — Phased PRs

Each phase is one small, independently reviewable PR. Ordering keeps `main` green: no UI ships before its backend exists, and every phase is independently valuable.

```
Phase 1 (BE: transfers API) ──► Phase 2 (FE: transfer UI) ──► Phase 3 (FE: expense form shortfall UX)
Phase 4 (BE: restock flag)   — independent, can land any time
Phase 5 (FE: target vs actual report) — independent, can land any time
```

---

### Phase 1 — Backend: budget transfers API

**Goal:** FR-1 end-to-end at the API layer. Directly mirrors the existing wallet-transfer implementation.

- Migration `000018_create_budget_transfers.up.sql` / `.down.sql`: create `budget_transfers` (schema in FR-1), FKs to `budgets`.
- Domain: `BudgetTransfer` entity in `budget_entity.go`; extend `BudgetRepository` with `GetBudgetTransferList` / `CreateBudgetTransfer`; extend `BudgetUsecase` with `CreateBudgetTransfer` (balance check + double update + insert inside `BeginTransaction`, modelled on `WalletUsecase.CreateWalletTransfer`) and `GetBudgetTransferList`.
- Data: MySQL entity/repo/transformer (`apps/api/data/mysql/budget_*.go`), mock repository update.
- Presentation: `GET/POST /budgets/{budgetId}/transfers` in `budget_route.go` + `budget_handler.go` + transformer.
- Contract: `BudgetTransfer`, `BudgetTransferRequest`, list/create response schemas in `libs/api-contract/src/api.yaml`; regenerate clients.
- Tests: usecase tests (sufficient/insufficient balance, same-budget rejection, non-positive amount, missing budget) + handler tests, mirroring wallet-transfer coverage.

**Acceptance:** transfer moves balance atomically between two budgets and appears in both budgets' transfer lists; all validation rules return `BadRequest`; wallets untouched. Migration up/down clean.

**Estimated diff:** ~400–500 LoC, almost all patterned on existing wallet-transfer code.

---

### Phase 2 — Frontend: budget transfer UI

**Goal:** FR-2 — make transfers usable without engineering help. Mirrors the wallet-transfer frontend suite.

- Domain layer (`libs/ui/src/domain`): `BudgetTransfer` entity, repository interface + query keys, `budgetTransferList` / `budgetTransferCreate` usecases (mirror `walletTransferList`/`walletTransferCreate`).
- Data layer: API implementations + transformers + mocks (`libs/ui/src/data/api/budget.ts`, `data/mock/budget.ts`).
- Presentation: `BudgetTransferListScreen`/`Handler`, `BudgetTransferCreateScreen`/`Handler`, `BudgetTransferFormView`, `BudgetTransferList(Item)` components + stories; wire "Transfers" / "New Transfer" actions into `BudgetListScreen` rows; routes in the web + mobile apps (mirror wallet-transfer routes).
- Tests: handler tests for list + create (success, insufficient balance error surfaced), matching wallet-transfer test coverage.

**Acceptance:** from the Budget list, a user can view a budget's transfer history and move an amount to another budget; balances refresh; API validation errors are shown inline.

**Estimated diff:** ~500–700 LoC, heavily copy-adapted from wallet transfer screens.

**Dependency:** Phase 1 merged.

---

### Phase 3 — Frontend: expense form budget visibility + inline shortfall top-up

**Goal:** FR-3 — the expense flow guides users to transfer instead of misclassify.

- `ExpenseFormView` (`libs/ui/src/presentation/components/expenses/`): budget select options render name + formatted remaining balance.
- Shortfall detection in `ExpenseCreateHandler` / `ExpenseUpdateHandler`: compare running form total vs. selected budget balance (for update, add back the expense's original total when the budget is unchanged, since the API refunds before re-deducting); render the inline warning with computed shortfall amount.
- "Top up from…" button opens the Phase 2 transfer form (modal or navigation, following how `TransactionPaymentAlert` embeds a flow) pre-filled with destination + shortfall amount; on success, invalidate/refetch the budget list so the warning re-evaluates.
- Tests: warning appears/clears with the right amounts; create/update flows for both the sufficient and shortfall paths; stories updated.

**Acceptance:** entering an expense larger than the selected budget's balance shows the shortfall and offers the top-up; after transferring, the same expense submits successfully against its **true** budget.

**Estimated diff:** ~250–400 LoC.

**Dependency:** Phase 2 merged.

---

### Phase 4 — Backend: replace hard-coded Restock budget id with a flag

**Goal:** FR-4. Independent of Phases 1–3; can land in parallel at any point.

- Migration `000019_add_budget_food_cost_flag.up.sql` / `.down.sql`: add `is_food_cost_target TINYINT(1) NOT NULL DEFAULT 0`; backfill `UPDATE budgets SET is_food_cost_target = 1 WHERE id = 4` (no-op if the row doesn't exist).
- Domain: add the field to `Budget`; in `PayTransaction`/`UnpayTransaction`, replace the `budgetItem.Id == restockBudgetId` check with `budgetItem.IsFoodCostTarget`; when no budget is flagged, fall through to the percentage allocation for all budgets.
- Data + presentation + contract: thread the field through MySQL entity/transformer, API transformers, `api.yaml`, regenerated clients (read-only exposure).
- Seeder: add a Restock budget with the flag set; existing seeded budgets get `false` explicitly.
- Tests: `transaction_usecase_test.go` — food cost routed to the flagged budget regardless of its id; no-flag fallback; unpay symmetry.

**Acceptance:** pay/unpay allocate food cost by flag, not id; a fresh seeded environment routes food cost correctly; existing production data behaves identically after backfill.

**Estimated diff:** ~200–300 LoC.

---

### Phase 5 — Frontend: allocation target vs. actual spend report

**Goal:** FR-5. Independent; frontend-only.

- `ExpenseStatisticScreen` / `ExpenseStatisticHandler`: combine the existing budget list (`Percentage`) with expense statistics for the selected period to compute actual share per budget; render a per-budget row: target %, actual %, delta (highlight over-target).
- Label the food-cost budget's target as nominal ("funded by food cost") once Phase 4 exposes the flag; before Phase 4 lands, fall back to showing its percentage like the rest.
- Component + story + handler test covering the share computation (including the zero-expense period edge case).

**Acceptance:** for any date range, the user sees each budget's target vs. actual spend share and can immediately spot chronically over/under-spent envelopes.

**Estimated diff:** ~200–350 LoC.

---

## Success Criteria (post-rollout)

1. **Statistics are truthful**: food purchases appear under Restock in expense statistics even in months where Restock's allocation was insufficient.
2. **Borrowing is visible**: the operator can answer "how many times did Restock need a top-up this month, and from where?" from the transfer history.
3. **Percentages get tuned**: after 1–2 months of transfer + target-vs-actual data, allocation percentages are adjusted and the transfer frequency drops.
4. **No new misclassification incentive**: the expense flow never requires picking a wrong budget to complete a purchase.
