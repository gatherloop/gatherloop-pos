# E2E Test Plan — Web App (`apps/web`)

## 1. Context & Goals

### Why E2E Tests Now?

The project already has strong test coverage at two levels:

- **55 usecase unit tests** — cover business logic (state machines, side effects)
- **39 handler integration tests** — cover full UI rendering with mock repositories (usecase → controller → handler → screen → components)

These tests catch logic bugs and rendering bugs effectively. However, they **cannot** catch:

| Gap | Example |
|-----|---------|
| Real API integration | A field renamed in the Go API that doesn't match the TypeScript transformer |
| SSR/cookie behavior | `getServerSideProps` auth redirect logic with real cookies |
| Cross-page navigation | Creating a product, then seeing it appear in the transaction creation flow |
| Real browser behavior | Print dialogs, keyboard shortcuts, CSS layout issues |
| Database state consistency | Creating a transaction that actually deducts wallet balance |

E2E tests fill these gaps by testing **real browser → real Next.js server → real Go API → real database**.

### Guiding Principles

1. **Don't duplicate handler tests** — Handler tests already cover every CRUD operation's loading/error/success states. E2E tests should focus on **cross-cutting flows** and **real integration**.
2. **Test critical business paths** — Prioritize flows that generate revenue or handle money (transactions, wallets).
3. **Keep tests independent** — Each test should set up its own data via API or UI, not depend on database state from other tests.
4. **Fast feedback** — Run only Chromium in CI by default. Cross-browser testing can run on a scheduled basis.

---

## 2. What to Test vs. What to Skip

### Flows That NEED E2E Testing

These flows have **high business value** and involve **cross-page/cross-entity integration** that handler tests can't cover:

| # | Flow | Why E2E adds value |
|---|------|--------------------|
| 1 | **Authentication** (login → protected page → logout) | Real cookie handling, SSR redirects, session persistence |
| 2 | **Transaction creation** (select products → apply coupon → pay → verify) | Core POS feature; spans products, coupons, wallets; involves money |
| 3 | **Transaction lifecycle** (create → view detail → mark as paid/unpaid) | Cross-page state changes with real database |
| 4 | **Product CRUD** (create → verify in list → update → delete → verify removed) | Validates the full CRUD cycle works with real API, including SSR data fetching |
| 5 | **Wallet & transfers** (create wallets → transfer between them → verify balances) | Money movement; critical for financial accuracy |
| 6 | **Expense tracking** (create budget → create expense against it → verify budget reflects it) | Cross-entity relationship: budget ↔ expense |

### Flows That DON'T Need E2E Testing

These are already well-covered by handler integration tests and provide low incremental value at E2E level:

| Flow | Why Skip |
|------|----------|
| **Category CRUD** | Simple entity, no cross-entity dependencies. Handler tests cover form/list/delete fully. |
| **Material CRUD** | Same as above — simple entity with name + unit fields. |
| **Supplier CRUD** | Simple entity, no financial implications. |
| **Coupon CRUD** | The coupon *creation* is simple; coupon *usage* is covered in the transaction E2E test. |
| **Calculation CRUD** | Recipe management — no cross-entity impact beyond variants/materials. Handler tests are sufficient. |
| **Individual component states** (loading spinners, error messages, empty states) | Handler tests + Storybook cover these comprehensively. |
| **Form validation edge cases** | Handler tests already test form interactions with real usecases. |
| **Rental flows** | Lower priority feature. Can be added later if needed. |

---

## 3. Implementation Phases

### Phase 1: Infrastructure Setup

**Goal**: Get the E2E test framework running reliably with proper test isolation.

**Tasks:**

1. **Update Playwright config** (`apps/web-e2e/playwright.config.ts`)
   - Fix the web server command (currently `npx nx start web2` — likely should be `npx nx dev web` or similar)
   - Add `globalSetup` for test environment preparation
   - Configure `storageState` for authenticated test reuse
   - Set reasonable timeouts (navigation: 15s, action: 10s)
   - Default to Chromium only for local dev; all browsers for CI

2. **Create test utilities** (`apps/web-e2e/src/utils/`)
   - `auth.ts` — Helper to log in via UI and save storage state, plus a helper to log in via direct API call (faster for setup)
   - `api.ts` — Direct API helpers to create/delete test data (products, categories, wallets, etc.) for test setup/teardown. This avoids UI-dependent setup and makes tests faster + more reliable.
   - `selectors.ts` — Shared page selectors/locators organized by feature (e.g., `transactionPage.productCard`, `navbar.logoutButton`)

3. **Create global setup/teardown**
   - `global-setup.ts` — Log in once, save auth cookies to `storageState.json` for reuse across tests
   - `global-teardown.ts` — Clean up test data if needed

4. **Create a seed data strategy**
   - Option A (recommended): Use direct API calls in `beforeAll`/`afterAll` to create and clean up test data per test file
   - Option B: Use a shared seed script that populates the database before the test suite runs
   - Decision depends on whether the Go API supports easy data creation/deletion endpoints

**Deliverables:**
- [ ] Updated `playwright.config.ts` with auth state, timeouts, and correct server command
- [ ] `apps/web-e2e/src/utils/auth.ts`
- [ ] `apps/web-e2e/src/utils/api.ts`
- [ ] `apps/web-e2e/src/utils/selectors.ts`
- [ ] `apps/web-e2e/src/global-setup.ts`
- [ ] Verify: `npx nx e2e web-e2e` runs the example test successfully against a running dev environment

---

### Phase 2: Authentication Flow

**Goal**: Verify the login/logout cycle and route protection work end-to-end.

**Test file:** `apps/web-e2e/src/auth.spec.ts`

**Test cases:**

```
describe('Authentication')
  ✓ should redirect unauthenticated user from "/" to "/auth/login"
  ✓ should log in with valid credentials and redirect to dashboard
  ✓ should show error message with invalid credentials
  ✓ should redirect authenticated user from "/auth/login" to "/"
  ✓ should log out and redirect to login page
  ✓ should not access protected routes after logout
```

**Why these tests matter:**
- The auth check happens in `getServerSideProps` on every page — this is SSR behavior that can't be tested in handler tests (which use mocked router)
- Cookie persistence across page navigations is a real browser concern
- The redirect chain (unauthenticated → login → dashboard) involves real HTTP redirects

**Deliverables:**
- [ ] `apps/web-e2e/src/auth.spec.ts` — All 6 test cases passing

---

### Phase 3: Product CRUD Flow

**Goal**: Verify the full create → list → update → delete cycle works with the real API.

**Test file:** `apps/web-e2e/src/products.spec.ts`

**Prerequisite data (via API helper):** Create a test category in `beforeAll`, clean up in `afterAll`.

**Test cases:**

```
describe('Product Management')
  ✓ should create a new product with name, price, and category
  ✓ should display the created product in the product list
  ✓ should search and find the product by name
  ✓ should update the product name and price
  ✓ should verify updated data persists after page reload
  ✓ should delete the product and verify it's removed from the list
```

**Why this flow (and not categories/materials):**
- Products are a **dependency** for the transaction flow (Phase 5) — we need confidence that product CRUD works end-to-end
- Products have more complexity than categories (image, category relation, variants, sale type)
- Validates the full SSR data-fetching pipeline: `getServerSideProps` → API call → render

**Deliverables:**
- [ ] `apps/web-e2e/src/products.spec.ts` — All 6 test cases passing

---

### Phase 4: Wallet & Transfer Flow

**Goal**: Verify wallet creation and money transfers work correctly with real balance tracking.

**Test file:** `apps/web-e2e/src/wallets.spec.ts`

**Test cases:**

```
describe('Wallet Management')
  ✓ should create two wallets (source and destination)
  ✓ should display both wallets in the wallet list with correct initial balances
  ✓ should transfer amount from source to destination wallet
  ✓ should verify balances updated correctly after transfer
  ✓ should display the transfer in the transfer history
```

**Why this flow:**
- Wallets handle real money — financial accuracy is critical for a POS system
- Transfer is a cross-entity operation (two wallets affected simultaneously)
- Balance consistency can only be verified with a real database

**Deliverables:**
- [ ] `apps/web-e2e/src/wallets.spec.ts` — All 5 test cases passing

---

### Phase 5: Transaction Flow (Core POS)

**Goal**: Verify the primary business flow — creating a sale transaction and processing payment.

**Test file:** `apps/web-e2e/src/transactions.spec.ts`

**Prerequisite data (via API helper):** Create test products, a category, and a wallet in `beforeAll`.

**Test cases:**

```
describe('Transaction Flow')
  ✓ should create a transaction by selecting products and quantities
  ✓ should display correct subtotal and total calculations
  ✓ should apply a coupon and verify discounted total
  ✓ should complete payment with selected wallet
  ✓ should display the new transaction in the transaction list
  ✓ should view transaction detail and verify line items match
  ✓ should mark an unpaid transaction as paid
```

**Why this is the most important E2E test:**
- This is the **core business flow** — it's what the POS system exists for
- It spans multiple entities: products, coupons, wallets, transactions
- It involves financial calculations that must be correct end-to-end
- The transaction creation page is the most complex page in the app (product selection, quantity management, coupon application, payment)

**Deliverables:**
- [ ] `apps/web-e2e/src/transactions.spec.ts` — All 7 test cases passing

---

### Phase 6: Expense & Budget Flow

**Goal**: Verify expense tracking against budgets works end-to-end.

**Test file:** `apps/web-e2e/src/expenses.spec.ts`

**Prerequisite data (via API helper):** Create a test wallet and budget in `beforeAll`.

**Test cases:**

```
describe('Expense & Budget Flow')
  ✓ should create a budget with a name and amount
  ✓ should create an expense linked to the budget and wallet
  ✓ should display the expense in the expense list
  ✓ should filter expenses by wallet
  ✓ should filter expenses by budget
  ✓ should verify budget reflects the expense amount
```

**Why this flow:**
- Cross-entity relationship: expense ↔ budget ↔ wallet
- Financial tracking accuracy matters for business reporting
- Filtering is a key user workflow for expense management

**Deliverables:**
- [ ] `apps/web-e2e/src/expenses.spec.ts` — All 6 test cases passing

---

## 4. Test Architecture Decisions

### Authentication Strategy

Use Playwright's **storageState** pattern:

```
global-setup.ts → logs in once → saves cookies to storageState.json
All test files → load storageState.json → already authenticated
auth.spec.ts → tests login/logout explicitly (does NOT use storageState)
```

This avoids logging in before every test, saving ~2-3 seconds per test.

### Test Data Strategy

**Approach: API-based setup + cleanup per test file**

```typescript
// Example: products.spec.ts
let testCategory: Category;

test.beforeAll(async ({ request }) => {
  testCategory = await api.createCategory(request, { name: 'E2E Test Category' });
});

test.afterAll(async ({ request }) => {
  await api.deleteCategory(request, testCategory.id);
});
```

**Why not a shared seed database?**
- Shared state creates ordering dependencies between test files
- API-based setup is self-documenting — you see exactly what data each test needs
- Cleanup is targeted — no risk of deleting production data

**Why not UI-based setup?**
- Slower (page loads, form fills, waits)
- More brittle (UI changes break setup, not just the test under focus)
- API calls are deterministic and fast

### Page Object Pattern — Keep It Light

Don't create full Page Object classes. Instead, use a simple **locator helpers** approach:

```typescript
// utils/selectors.ts
export const productList = {
  searchInput: (page: Page) => page.getByPlaceholder('Search'),
  createButton: (page: Page) => page.getByRole('link', { name: 'Create' }),
  productCard: (page: Page, name: string) => page.getByText(name),
  deleteButton: (page: Page) => page.getByRole('button', { name: 'Delete' }),
  confirmButton: (page: Page) => page.getByRole('button', { name: 'Confirm' }),
};
```

This is lighter than full POM, easier to maintain, and Playwright's built-in locators already provide good abstraction.

### CI Configuration

```
Local dev:    Chromium only, headed mode optional
CI (per PR):  Chromium only, headless, retry 1x, trace on failure
CI (nightly): Chromium + Firefox + WebKit, headless, retry 2x, full traces
```

---

## 5. Phase Summary & Priority

| Phase | Scope | Est. Tests | Priority | Depends On |
|-------|-------|-----------|----------|------------|
| **Phase 1** | Infrastructure setup | 0 (framework) | **P0** | — |
| **Phase 2** | Authentication flow | 6 | **P0** | Phase 1 |
| **Phase 3** | Product CRUD | 6 | **P1** | Phase 1, 2 |
| **Phase 4** | Wallet & transfers | 5 | **P1** | Phase 1, 2 |
| **Phase 5** | Transaction flow (core POS) | 7 | **P1** | Phase 1, 2, 3 (needs products) |
| **Phase 6** | Expense & budget | 6 | **P2** | Phase 1, 2, 4 (needs wallets) |

**Total: ~30 test cases across 5 test files + infrastructure**

### Execution Order

Phases 1 → 2 are sequential (infrastructure, then auth). After that:
- Phase 3 and 4 can be done **in parallel** (independent entities)
- Phase 5 depends on Phase 3 (needs product test data patterns established)
- Phase 6 depends on Phase 4 (needs wallet test data patterns established)

```
Phase 1 (infra) → Phase 2 (auth) → Phase 3 (products) ──→ Phase 5 (transactions)
                                  → Phase 4 (wallets)  ──→ Phase 6 (expenses)
```

---

## 6. What This Plan Intentionally Excludes

| Excluded | Rationale |
|----------|-----------|
| **Mobile E2E** (`apps/mobile`) | Out of scope per requirements. Can be planned separately. |
| **Visual regression testing** | Better handled by Storybook + Chromatic (see TESTING_REVIEW.md §3.3). |
| **Performance/load testing** | Different testing discipline; not part of functional E2E. |
| **Category/Material/Supplier/Calculation CRUD** | Simple entities fully covered by handler integration tests. No cross-entity dependencies that warrant E2E. |
| **Rental flows** | Lower-priority feature. Can be added as a future phase if business needs require it. |
| **Error state testing** (API down, network failures) | Handler tests cover error UI thoroughly. E2E tests should focus on happy paths and critical edge cases. |
