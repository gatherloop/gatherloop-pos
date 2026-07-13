# Testing Strategy

Gatherloop POS is tested at three levels, each catching a different class of bug, and each made possible by the layer boundaries described in [Clean Architecture](/under-the-hood/clean-architecture).

## 1. Usecase unit tests — business logic in isolation

Every usecase's state machine (`getInitialState` → `getNextState` → `onStateChange`) is tested against a **mock repository**, with no server, no database, and no UI rendered at all — just actions in, state out.

- **Frontend:** 70+ usecase test files under [`libs/ui/src/domain/usecases`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui/src/domain/usecases), e.g. [`transactionList.test.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/domain/usecases/transactionList.test.ts).
- **Backend:** Go usecase tests alongside their implementation in [`apps/api/domain`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/api/domain), e.g. [`transaction_usecase_test.go`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/domain/transaction_usecase_test.go).

This is where the bulk of business-rule coverage lives — a discount calculation, a wallet balance deduction, a budget recomputation — because it's the cheapest layer to test and the one that changes most often.

## 2. Handler / integration tests — full rendering with mock data

One layer up, **handler tests** render the full presentation stack — controller → handler → screen → components — with [React Testing Library](https://testing-library.com/react), backed by the same mock repositories as the usecase tests. These catch bugs unit tests can't: a prop mapped incorrectly, a loading state never wired to a spinner, a confirmation modal that doesn't actually call the delete action.

- **Frontend:** 47 handler test files under [`libs/ui/src/presentation/screens`](https://github.com/gatherloop/gatherloop-pos/tree/main/libs/ui/src/presentation/screens), e.g. [`TransactionListHandler.test.tsx`](https://github.com/gatherloop/gatherloop-pos/blob/main/libs/ui/src/presentation/screens/TransactionListHandler.test.tsx).
- **Backend:** HTTP handler tests in [`apps/api/presentation/restapi`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/api/presentation/restapi) exercise real `net/http/httptest` requests against a handler backed by mock repositories, e.g. [`transaction_handler_test.go`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/presentation/restapi/transaction_handler_test.go). A smaller set of repository tests, such as [`transaction_repo_test.go`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/api/data/mysql/transaction_repo_test.go), run the real SQL against a test database to verify the queries themselves.

Together, these two levels mean every CRUD screen's loading, error, empty, and success states — and every API handler's request parsing and response shape — are covered without ever needing a running system.

## 3. End-to-end tests — real browser, real API, real database

What neither of the above can catch: a field renamed on the Go side that silently breaks the TypeScript transformer, an SSR auth redirect, a print dialog, or a transaction that's supposed to actually deduct a wallet balance in the database. [Playwright](https://playwright.dev) tests in [`apps/web-e2e`](https://github.com/gatherloop/gatherloop-pos/tree/main/apps/web-e2e/src) drive a real Chromium browser against a real Next.js server, a real Go API, and a real database.

E2E coverage is deliberately narrow — it targets **cross-page, cross-entity, money-handling flows** that the layers above can't reach, and skips what's already well covered by handler tests:

| Flow | File | Why E2E |
|---|---|---|
| Authentication | [`auth.spec.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web-e2e/src/auth.spec.ts) | Real cookies and `getServerSideProps` redirects |
| Product CRUD | [`products.spec.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web-e2e/src/products.spec.ts) | Full SSR data-fetch pipeline; a dependency for the transaction flow |
| Wallets & transfers | [`wallets.spec.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web-e2e/src/wallets.spec.ts) | Real money movement between two records at once |
| Transactions | [`transactions.spec.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web-e2e/src/transactions.spec.ts) | The core POS flow: products → coupon → payment → wallet, spanning multiple entities |
| Expenses & budgets | [`expenses.spec.ts`](https://github.com/gatherloop/gatherloop-pos/blob/main/apps/web-e2e/src/expenses.spec.ts) | Cross-entity relationship between expense, budget, and wallet |

Simple, self-contained entities — categories, materials, suppliers, coupon creation — are intentionally *not* E2E tested; handler tests already cover their CRUD states fully, and the incremental value of a full browser round-trip is low. Test data for each spec is created and torn down through direct API calls in `beforeAll`/`afterAll` rather than through the UI, keeping runs fast and independent of each other. The full rationale lives in [`E2E_TEST_PLAN.md`](https://github.com/gatherloop/gatherloop-pos/blob/main/E2E_TEST_PLAN.md) at the repo root.

## The shape of the pyramid

```
        ▲   E2E (Playwright)         5 flows — cross-cutting, money-critical
       ▲▲▲  Handler / HTTP tests     ~65 files — full render / full request per screen & endpoint
      ▲▲▲▲▲ Usecase tests            ~90 files — every business rule, isolated
```

Most bugs are cheapest to catch at the bottom, where a test needs no server, no browser, and runs in milliseconds — so that's where most of the tests live. E2E stays small and focused on what only a real, fully-wired system can prove.
