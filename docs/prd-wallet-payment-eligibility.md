# PRD: Wallet Payment Eligibility Flag

## Problem Statement

When a cashier completes a transaction, the **Transaction Payment** modal pops up and asks them to pick the wallet that the customer's money should land in. Today the dropdown lists **every** wallet in the system — including wallets that are not actual customer-facing payment destinations.

For example, our current wallet catalog contains things like:

- `Cash 1`, `Cash 2`, `QRIS` — real payment targets a customer can hand money to.
- `Brankas` (safe / vault) — an **internal holding wallet** used only for bookkeeping and inter-wallet transfers. Customers never pay into it.

Because the modal does not distinguish between these two kinds of wallets, the cashier can accidentally book a sale against `Brankas` (or any other internal wallet we add later). When that happens:

1. The balance of `Brankas` is silently inflated, breaking end-of-day reconciliation.
2. The intended cash drawer / QRIS account is **not** credited, so the physical money the cashier received has no matching record.
3. Fixing it after the fact requires manually reversing the transaction or hand-rolling a wallet transfer — both error-prone.

We need a way to mark a wallet as "**eligible to be a transaction payment target**" or not, and to hide ineligible wallets from the payment modal — while still letting them appear everywhere else (wallet list, wallet transfers, balance reports).

---

## Context: Existing System

- **Backend**: Go REST API + MySQL, Clean Architecture (`domain → data → presentation`). Migrations under `apps/api/migrations` (numbered, sequential, with `.up.sql` / `.down.sql` pairs).
- **Frontend**: Next.js web app + React Native mobile app, sharing `libs/ui` (Tamagui). Types come from `libs/api-contract/src/api.yaml` via generated React Query hooks.
- **Wallet entity** (`apps/api/domain/wallet_entity.go`) today:
  - `Id`, `Name`, `Balance`, `PaymentCostPercentage`, `IsCashless`, `DeletedAt`, `CreatedAt`.
- **Wallet table** (`apps/api/migrations/000001_initial_schema.up.sql`, lines 44–53): mirrors the entity.
- **API endpoints** (`apps/api/presentation/restapi/wallet_handler.go`): standard CRUD on `/wallets`, plus `/wallets/{id}/transfers` for inter-wallet movement.
- **Payment modal**: `libs/ui/src/presentation/components/transactions/TransactionPaymentAlert.tsx` renders a `<Select>` whose options come from `transactionPayController.state.wallets` (built in `TransactionCreateHandler.tsx`, lines 312–317). **No filtering** is applied today — every wallet returned by `GET /wallets` is offered.
- **Boolean-flag prior art**: `IsCashless` is the closest existing pattern — `TINYINT(1) NOT NULL DEFAULT 0` in MySQL, `bool` in Go, `boolean` in OpenAPI. We will mirror this pattern.
- **Auth**: JWT, no RBAC. Any logged-in crew member can edit wallets.

---

## Proposed Solution

Add a single new boolean field on `Wallet`:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `is_payment_target` | bool | `true` | Whether this wallet may be selected as the destination wallet when paying a transaction. `true` means it appears in the Transaction Payment modal; `false` means it is hidden from that modal but otherwise behaves normally. |

The flag is **wallet-scoped**, not transaction-scoped — the manager configures it once on the wallet, and every future transaction respects the setting.

### Where the flag applies vs. where it does not

| Surface | Filtered by `is_payment_target`? |
|---|---|
| Transaction Payment modal (`TransactionPaymentAlert`) | **Yes** — only `is_payment_target = true` wallets are shown. |
| Wallet list page (settings / management) | No — all non-deleted wallets are listed, the flag is shown as a column / badge. |
| Wallet transfer source & destination pickers | No — internal wallets like `Brankas` must remain available for transfers. |
| Expense-payment wallet picker, top-up flows, reports | No — out of scope; default behaviour unchanged. |

### Backward-compatibility default

Existing wallets are backfilled with `is_payment_target = true` so the migration is non-breaking — every wallet that is selectable today stays selectable. Managers then opt internal wallets (e.g. `Brankas`) **out** by editing them. This is intentional: a "default deny" rollout would silently break checkout for every existing tenant.

---

## Feature Requirements

### FR-1: Extend Wallet with `is_payment_target`

Add the field defined in the table above to the `Wallet` entity, MySQL schema, OpenAPI contract, request/response transformers, and seed data.

**Rules:**
- Type: boolean, **required** on create/update requests (no implicit default at the API layer — clients must send it explicitly so the choice is always intentional).
- Existing rows are backfilled to `true` during migration (see Phase 1 below).
- No cross-field validation: a wallet may be both `is_cashless = true` and `is_payment_target = false` (e.g. a cashless internal holding account); the two flags are independent.
- Soft-deleted wallets (`deleted_at IS NOT NULL`) are already excluded from `GET /wallets` — this PRD does not change that behaviour.

### FR-2: Filter the Transaction Payment modal

The wallet dropdown inside `TransactionPaymentAlert` shall only show wallets where `is_payment_target = true`.

**Rules:**
- Filtering happens on the **frontend**, using the already-loaded wallet list — no new endpoint is needed. The wallet list is small (< 50 rows in practice) so this is cheap and avoids fragmenting the API.
- The filter applies **only** to the Transaction Payment modal. Wallet transfers, expense flows, and the wallet management screen are untouched.
- If, after filtering, **zero** wallets remain eligible, the modal shows an empty-state message ("No wallets are configured to receive payments. Configure one in Wallet Settings.") and the Pay button is disabled. This is a misconfiguration, not a normal flow — but the UI must fail loudly rather than silently disable itself.

### FR-3: Surface the flag in Wallet management UI

The flag must be editable from the wallet create/update form and visible from the wallet list, so managers can configure it without engineering help.

**Rules:**
- Wallet create form: a labelled switch / checkbox **"Can receive transaction payments"** (default ON). Inline help: *"Turn this off for internal wallets (e.g. a safe or holding account) that should not appear in the checkout payment modal."*
- Wallet update form: same control, pre-filled with the current value.
- Wallet list table: new column **"Payment Target"** rendering a badge (`Yes` / `No`) or a checkmark — concise enough to fit alongside the existing columns. On mobile, this column can collapse into a secondary row.

---

## Out of Scope

- Per-user or per-role payment-target configuration (e.g. "cashier A can pay into Brankas but cashier B cannot"). No RBAC exists today; this PRD does not introduce it.
- Time-bound eligibility (e.g. "only during weekends"). The flag is a static configuration on the wallet.
- Hiding ineligible wallets from **other** flows (expense payments, top-ups, reports). Out of scope to keep the blast radius small; we can revisit per-flow if a user need emerges.
- Migrating any existing wallet from `true` to `false` automatically. Operators decide which internal wallets to flip off after the feature ships.
- Auditing / history of who toggled the flag. Out of scope — the wallet table has no audit log today and adding one is a separate concern.
- Mobile-app-specific UX polish beyond what the shared Tamagui screens give for free.

---

## Open Questions

1. **Naming.** `is_payment_target` reads well in code and is consistent with `is_cashless`. The user-facing label is **"Can receive transaction payments"**. If product prefers a shorter UI label (e.g. "Checkout wallet"), we can swap the label without changing the field name.
2. **Seed data.** Should the seeder pre-mark a known internal wallet (e.g. `Brankas`) as `is_payment_target = false` out of the box, so fresh environments demonstrate the feature? Suggested **yes** — change is contained in `apps/api/seeds/wallet_seeder.go` and adds zero risk to existing deployments.

---

# Implementation Plan — Phased PRs

Each phase below is sized to land as **one reviewable PR**. Phases are ordered so that every PR keeps `main` green: the API stays backward-compatible after Phase 1, and no UI ships before its supporting backend field exists.

The plan is **three PRs**: backend field + API contract; frontend filtering in the payment modal; wallet management UI for the flag.

---

### Phase 1 — Backend: add `is_payment_target` to Wallet

**Goal:** Ship FR-1 end-to-end at the API layer so the field exists, is persisted, and is returned by every wallet endpoint — without changing any UI behaviour yet.

**Backend**
- Migration `000011_add_wallet_is_payment_target.up.sql` / `.down.sql`:
  - Add `is_payment_target TINYINT(1) NOT NULL DEFAULT 1` to the `wallets` table.
  - No backfill statement needed — the `DEFAULT 1` on `ADD COLUMN` covers existing rows in MySQL.
  - `.down.sql` drops the column.
- Update `apps/api/domain/wallet_entity.go`: add `IsPaymentTarget bool` field, mirroring the position/style of `IsCashless`.
- Update `apps/api/data/mysql/wallet_entity.go` and `apps/api/data/mysql/wallet_transformer.go` to read/write the new column.
- Update `apps/api/presentation/restapi/wallet_transformer.go`:
  - `ToApiWallet`: include `IsPaymentTarget` in the response.
  - `ToWalletRequest`: read `IsPaymentTarget` from the request body.
- Update `libs/api-contract/src/api.yaml`:
  - Add `isPaymentTarget: boolean` to the `Wallet` response schema **and** the `WalletRequest` request schema (required field).
  - Regenerate Go + TS clients (`npm run generate-api` or whatever the existing command is).
- Update `apps/api/data/mock/wallet_repository.go` if it returns hard-coded fixtures.
- Update `apps/api/seeds/wallet_seeder.go`: every seeded wallet sets `IsPaymentTarget` explicitly; the `Brankas`-style internal wallet (if present) is seeded with `false`, all others with `true`. (Resolves Open Question 2.)
- Update existing handler tests (`wallet_handler_test.go`) and usecase tests (`wallet_usecase_test.go`) to cover the new field on create / update / get / list.

**Frontend**
- No user-facing changes. The generated TS types will gain `isPaymentTarget` automatically — leave it unused for now (TypeScript optional consumption is fine since the field is always present in responses).

**Acceptance**
- `GET /wallets` returns `isPaymentTarget` for every wallet; existing wallets are returned with `isPaymentTarget = true`.
- `POST /wallets` and `PUT /wallets/{id}` accept `isPaymentTarget` and persist it.
- Migration applies cleanly on a populated database; `down` reverses cleanly.
- All existing wallet tests pass; new field is covered in at least one test per handler.

**Estimated diff size:** ~200–300 LoC. Self-contained.

---

### Phase 2 — Frontend: filter the Transaction Payment modal

**Goal:** Ship FR-2 — hide ineligible wallets from the checkout payment dropdown, with an explicit empty-state for the misconfiguration case.

**Frontend**
- In `libs/ui/src/presentation/screens/TransactionCreateHandler.tsx` (around lines 312–317), filter the wallet list before mapping to select options:
  ```ts
  walletSelectOptions: transactionPayController.state.wallets
    .filter((wallet) => wallet.isPaymentTarget)
    .map((wallet) => ({ label: wallet.name, value: wallet })),
  ```
- In `libs/ui/src/presentation/components/transactions/TransactionPaymentAlert.tsx`:
  - When `walletSelectOptions` is empty, render an inline empty-state message ("No wallets are configured to receive payments. Configure one in Wallet Settings.") in place of the `<Select>`.
  - Disable the **Pay** button while the empty-state is visible.
- Update or add tests for `TransactionPaymentAlert` (snapshot or RTL) that cover:
  - Eligible wallets only appear in the dropdown.
  - When zero wallets are eligible, the empty-state renders and Pay is disabled.

**Backend**
- None.

**Acceptance**
- Toggling `isPaymentTarget = false` on a wallet (via direct DB update or the Phase 3 UI once that ships) removes it from the Transaction Payment modal on the next render.
- Wallet transfers, expense flows, and the wallet list still show all wallets.
- The empty-state appears and Pay is disabled when no wallet is eligible.

**Estimated diff size:** ~100–200 LoC.

**Dependency:** Phase 1 must be merged and deployed first so `isPaymentTarget` is present on responses.

---

### Phase 3 — Frontend: manage the flag from Wallet UI

**Goal:** Ship FR-3 — let managers toggle the flag without engineering help.

**Frontend**
- Wallet create form (`WalletCreateScreen` / equivalent in `libs/ui`): add a **"Can receive transaction payments"** switch, defaulting to ON, wired into the form schema (Zod or whatever is in use) and submission payload.
- Wallet update form (`WalletUpdateScreen` / equivalent): same switch, pre-filled from the fetched wallet.
- Wallet list table: add a **"Payment Target"** column with a Yes/No badge. On mobile / narrow viewports, collapse the column into a secondary row beneath the wallet name (matching the pattern used by the inventory list).
- Inline help under the switch: *"Turn this off for internal wallets (e.g. a safe or holding account) that should not appear in the checkout payment modal."*
- Update the wallet entity / Zod schema in `libs/ui/src/domain/...` to require `isPaymentTarget`.
- Tests: form validation rejects missing `isPaymentTarget`; list renders the new column.

**Backend**
- None.

**Acceptance**
- Creating a new wallet with the switch off persists `is_payment_target = 0` and the wallet does not appear in the Transaction Payment modal.
- Editing an existing wallet to flip the switch updates the value and reflects immediately on the wallet list and on the next render of the payment modal.
- All form validation continues to work; existing wallet management flows are not regressed.

**Estimated diff size:** ~250–400 LoC.

**Dependency:** Phase 1 (field exists in API). Independent of Phase 2 — can ship in either order, but shipping Phase 2 first means the feature is *active* the moment Phase 3 lets managers configure it.
