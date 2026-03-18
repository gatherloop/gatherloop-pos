# Frontend Automated Testing Review & Plan

## 1. Architecture Overview

The project follows **Clean Architecture** with clear layer separation in `libs/ui`:

```
libs/ui/src/
├── domain/          ← Business logic (framework-agnostic)
│   ├── entities/    ← Data models (Product, Transaction, etc.)
│   ├── repositories/← Repository interfaces (contracts)
│   └── usecases/    ← State machines (Usecase<State, Action, Params>)
├── data/            ← Infrastructure
│   ├── api/         ← Real API repository implementations
│   ├── mock/        ← Mock repository implementations for testing
│   └── url/         ← URL-based query parameter repositories
├── presentation/    ← UI layer
│   ├── controllers/ ← React hooks bridging usecases → React state (useReducer)
│   ├── components/  ← Pure UI components (Tamagui-based, cross-platform)
│   └── screens/     ← Screen compositions (Handler + Screen pattern)
├── app/             ← Dependency injection / composition root
└── utils/           ← Shared utilities (UsecaseTester, debounce, etc.)
```

**Key architectural pattern**: Each usecase is a **finite state machine** with:
- `getInitialState()` → initial state
- `getNextState(state, action)` → pure state reducer
- `onStateChange(state, dispatch)` → side effects (API calls, etc.)

---

## 2. Current Testing State — What Exists

### 2.1 Domain Layer Tests (55 files) ✅ STRONG

All usecases have tests covering success and error flows. Pattern:

```typescript
const tester = new UsecaseTester(usecase);
expect(tester.state.type).toBe('loading');
await Promise.resolve(); // flush microtasks
expect(tester.state.type).toBe('loaded');
```

**Strengths:**
- Every usecase has both success and error flow coverage
- Tests validate full state machine transitions: idle → loading → loaded/error
- Mock repositories implement domain interfaces cleanly with `setShouldFail()` toggle
- The `UsecaseTester` helper is elegant — it synchronously drives the state machine

**Issues found:**
1. **Test isolation problem**: `describe` blocks share mutable state across `it` blocks via closure variables (e.g., `let productList` assigned in one `it`, read in the next). Tests depend on execution order and will break if run individually or reordered. This is fragile.
2. **Redundant `beforeEach`**: Some test files declare `beforeEach` with repository setup but then also create separate repositories inside `describe` blocks (see `productList.test.ts` lines 14-19 vs 23-24). The `beforeEach` repos are unused.
3. **Assertion verbosity**: Every test asserts the entire state object. This is thorough but makes tests brittle — any new field added to state breaks ALL tests. Consider using `expect.objectContaining()` for fields that aren't the focus.
4. **Async microtask flushing**: Using `await Promise.resolve()` works but is fragile for multiple async steps. A dedicated `flushPromises` utility would be more robust.

### 2.2 Utility Tests (1 file) ✅ OK

- `math.test.ts` tests `roundToNearest500()` — straightforward and correct.

### 2.3 E2E Tests (2 files) ❌ PLACEHOLDER ONLY

- `apps/web-e2e/src/example.spec.ts` and `apps/mobile-e2e/src/example.spec.ts` are Playwright scaffolds with a single "has title" test.
- Not testing any real user flows.

### 2.4 What's Completely MISSING

| Layer | What's Missing | Impact |
|-------|---------------|--------|
| **Presentation / Controllers** | Zero tests for React hooks (`useProductListController`, etc.) | Can't verify the bridge between usecase state machines and React component state works correctly |
| **Presentation / Components** | Zero component render tests | Can't verify UI renders correct content for each state variant (loading, error, loaded, empty) |
| **Presentation / Screens** | Zero integration tests for Handler components | Can't verify the orchestration logic (e.g., "after delete success, refetch list") |
| **Data / API** | Zero tests for API repositories or transformers | Can't verify data mapping from API contracts to domain entities |
| **Data / URL** | Zero tests for URL query repositories | Can't verify URL param parsing/serialization |
| **E2E** | No real user flow tests | Can't verify critical paths work end-to-end |

---

## 3. Revised Testing Strategy

### 3.0 Why the Original Plan Was Over-Engineered

The original plan (below in the appendix) proposed testing every layer independently: transformers, URL repos, controllers, components, handlers, and E2E. While thorough on paper, this creates a **heavy maintenance burden** with diminishing returns. Most of these layers are thin glue code — testing them in isolation doesn't catch the bugs that actually matter (integration between layers).

After reviewing the architecture more carefully, the real value lies in **two testing surfaces** that together cover nearly all meaningful code paths, plus **Storybook** for visual verification.

### Revised Testing Pyramid

```
         /   Storybook   \          ← Visual & interaction testing for components
        / Handler Integ.   \        ← Mock repos + REAL usecases + handler + screen
       /  Usecase Unit      \       ← State machine logic (EXISTING ✅)
```

This is a **pragmatic, focused strategy** that maximizes coverage-per-test while minimizing maintenance cost.

---

### 3.1 Layer 1: Usecase Unit Tests (Keep & Improve)

**Status**: Already strong (55 test files). These remain the foundation.

**What they cover**: Core business logic — state machine transitions, side effects, error handling.

**What to fix**:
1. **Test isolation** — stop sharing mutable state across `it` blocks via closures. Each test should create its own `UsecaseTester`.
2. **Use `expect.objectContaining()`** — avoid asserting the full state object so tests don't break when new fields are added.
3. **Standardize on `flushPromises()`** — replace inconsistent `await Promise.resolve()` calls.

**Recommended pattern:**

```typescript
describe('ProductListUsecase', () => {
  const createTester = (overrides?: { shouldFail?: boolean }) => {
    const repository = new MockProductRepository();
    if (overrides?.shouldFail) repository.setShouldFail(true);
    const queryRepo = new MockProductListQueryRepository();
    const usecase = new ProductListUsecase(repository, queryRepo, {
      products: [],
      totalItem: 0,
    });
    return { tester: new UsecaseTester(usecase), repository };
  };

  it('should transition loading → loaded on success', async () => {
    const { tester, repository } = createTester();
    expect(tester.state.type).toBe('loading');
    await flushPromises();
    expect(tester.state).toEqual(expect.objectContaining({
      type: 'loaded',
      products: repository.products,
    }));
  });

  it('should transition loading → error on failure', async () => {
    const { tester } = createTester({ shouldFail: true });
    await flushPromises();
    expect(tester.state.type).toBe('error');
  });
});
```

---

### 3.2 Layer 2: Handler Integration Tests (New — Core Addition)

This is the **key change** from the original plan. Instead of testing controllers, components, and handlers each in isolation, we test the **handler with real usecases** (backed by mock repos). This exercises the full chain:

```
Mock Repository → Real Usecase → Real Controller → Handler → Screen → Components
```

#### Why This Is Better Than the Original Plan

The current handler tests (e.g., `ProductListHandler.test.tsx`) **mock the controllers**:

```typescript
// CURRENT APPROACH — mocks away the most important layer
jest.mock('../controllers', () => ({
  useProductListController: () => ({
    state: productListCtrl.state,    // ← fake state, not from usecase
    dispatch: productListCtrl.dispatch, // ← jest.fn(), not real dispatch
  }),
}));
```

This defeats the purpose. The handler's job is to orchestrate usecases and map their state to UI — but the test replaces the usecases with static objects. It can't catch:
- Usecase state transitions not matching what the handler expects
- Controller wiring issues
- Race conditions between multiple usecases

**The revised approach** removes the controller mocks entirely:

```typescript
// REVISED APPROACH — real usecases, only mock the data boundary
describe('ProductListHandler', () => {
  const createHandler = (overrides?: { shouldFail?: boolean }) => {
    const productRepo = new MockProductRepository();
    if (overrides?.shouldFail) productRepo.setShouldFail(true);
    const queryRepo = new MockProductListQueryRepository();
    const authRepo = new MockAuthRepository();

    return render(
      <ProductListHandler
        productListUsecase={new ProductListUsecase(productRepo, queryRepo, {
          products: [],
          totalItem: 0,
        })}
        productDeleteUsecase={new ProductDeleteUsecase(productRepo)}
        authLogoutUsecase={new AuthLogoutUsecase(authRepo)}
      />
    );
  };

  it('should show loading then product list after fetch', async () => {
    const { getByText } = createHandler();
    expect(getByText('Fetching Products...')).toBeTruthy();

    await act(async () => { await flushPromises(); });
    expect(getByText('Product 1')).toBeTruthy(); // from MockProductRepository
  });

  it('should show error state when fetch fails', async () => {
    const { getByText } = createHandler({ shouldFail: true });
    await act(async () => { await flushPromises(); });
    expect(getByText('Failed to Fetch Products')).toBeTruthy();
  });

  it('should refetch list after successful delete', async () => {
    const { getByText, getByRole } = createHandler();
    await act(async () => { await flushPromises(); }); // reach loaded

    // Trigger delete flow through the UI
    fireEvent.press(getByText('Delete'));
    fireEvent.press(getByText('Confirm'));
    await act(async () => { await flushPromises(); });

    // List should have refetched (still shows products because mock doesn't actually delete)
    expect(getByText('Product 1')).toBeTruthy();
  });
});
```

#### What This Covers

| Code Path | Covered? |
|-----------|----------|
| Mock repository data | Yes — it's the data source |
| Usecase state machine | Yes — real usecase runs |
| Controller (useReducer bridge) | Yes — real hook runs |
| Handler orchestration logic | Yes — the component under test |
| Screen component rendering | Yes — rendered as child |
| Individual UI components | Yes — rendered transitively |
| State-to-variant mapping | Yes — handler's `match()` runs with real state |

#### Diagnostic Power

When a handler test fails, the debugging path is clear:

1. **Check usecase tests first** — if they pass, the core logic is fine
2. **If usecase tests also fail** — fix the usecase (root cause)
3. **If usecase tests pass but handler test fails** — the bug is in one of:
   - Handler orchestration logic (the `useEffect` wiring)
   - State-to-props mapping (the `match()` in handler)
   - Component rendering
   - Mock repository data

Since handler orchestration and state mapping are small, focused code, these are easy to debug manually.

---

### 3.3 Layer 3: Storybook for Components (New — Visual Testing)

Instead of writing unit tests for every component variant, use **Storybook** to visually verify components in all their states.

**Why Storybook over component unit tests:**
- Components are **prop-driven and pure** — they don't have logic to test, they have *appearance* to verify
- Storybook makes it trivial to see all states at a glance (loading, error, empty, loaded with many items, etc.)
- Storybook stories double as **living documentation** for the component library
- Visual regression testing (via Chromatic or similar) catches CSS/layout bugs that unit tests miss entirely
- Developers can interactively test event handlers (onPress, onChange, etc.) in the Storybook UI

**Example stories:**

```typescript
// presentation/components/products/ProductList.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ProductList } from './ProductList';

const meta: Meta<typeof ProductList> = {
  component: ProductList,
  args: {
    searchValue: '',
    saleType: 'all',
    currentPage: 1,
    totalItem: 50,
    itemPerPage: 10,
    onSearchValueChange: fn(),
    onSaleTypeChange: fn(),
    onRetryButtonPress: fn(),
    onPageChange: fn(),
    onItemPress: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof ProductList>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const Loaded: Story = {
  args: {
    variant: {
      type: 'loaded',
      items: [
        { id: 1, name: 'Nasi Goreng', category: { id: 1, name: 'Food', createdAt: '' }, imageUrl: '...', options: [], saleType: 'purchase', createdAt: '' },
        { id: 2, name: 'Es Teh', category: { id: 2, name: 'Drink', createdAt: '' }, imageUrl: '...', options: [], saleType: 'purchase', createdAt: '' },
      ],
    },
  },
};
```

**What Storybook covers:**
- Visual correctness of every component state
- Interactive event handler verification (click, type, etc.)
- Cross-browser/responsive testing (if configured)
- Design system consistency

**What it doesn't cover (and doesn't need to):**
- Business logic (covered by usecase tests)
- Integration between components (covered by handler tests)

---

### 3.4 What We Intentionally Skip (and Why)

| Layer | Why We Skip Dedicated Tests |
|-------|----------------------------|
| **Transformers (data/api)** | Already covered by existing tests. Low risk — they're pure mappers. If an API contract changes, the handler integration test will catch it because mock repos mirror the domain interface, and real API calls would fail visibly. Keep the existing transformer tests but don't prioritize expanding them. |
| **URL query repos (data/url)** | Already covered by existing tests. Same as above — keep what exists but these are simple getters/setters. If `getPage()` breaks, the handler test will show wrong pagination behavior. |
| **Controllers** | These are 5-line hooks that call `useReducer` + `useEffect`. Testing them in isolation provides almost zero value — the handler integration tests exercise them fully. The existing controller tests can be **deleted** once handler integration tests are in place. |
| **Individual component unit tests** | Storybook covers visual correctness better than `expect(getByText(...))` assertions. The handler integration tests already verify components render correctly for real state transitions. |

---

### 3.5 Data Layer Tests: Keep What Exists

The existing transformer tests (`data/api/*.test.ts`) and URL repo tests (`data/url/*.test.ts`) are already written, low-maintenance, and provide value as a fast feedback loop for pure functions. **Keep them** — but don't prioritize writing new ones for every transformer. They're a nice-to-have safety net, not a critical testing surface.

---

### 3.6 E2E Tests (Future — Lower Priority)

With usecase tests + handler integration tests + Storybook, the remaining gap is **real API integration** and **real browser behavior**. E2E tests with Playwright should cover critical user flows when the team has bandwidth:

1. Authentication flow (login → dashboard)
2. Core CRUD flows (create → list → edit → delete)
3. Transaction flow (create → pay → verify)

These are high-effort but provide the final safety net for production.

---

## 4. Improvements to Testing Infrastructure

### 4.1 Fix `UsecaseTester` Isolation

Standardize on factory functions per test file to eliminate shared mutable state:

```typescript
// Each test file gets a createTester() that returns fresh instances
const createTester = (overrides?: { shouldFail?: boolean }) => {
  const repository = new MockProductRepository();
  if (overrides?.shouldFail) repository.setShouldFail(true);
  const queryRepo = new MockProductListQueryRepository();
  const usecase = new ProductListUsecase(repository, queryRepo, {
    products: [],
    totalItem: 0,
  });
  return { tester: new UsecaseTester(usecase), repository, queryRepo };
};
```

### 4.2 Standardize `flushPromises`

Replace inconsistent `await Promise.resolve()` with the existing `flushPromises` utility:

```typescript
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
```

### 4.3 Handler Test Setup

Create a shared test helper for handler integration tests that provides the necessary providers and mocks for navigation/toast:

```typescript
// utils/testUtils.tsx
import { TamaguiProvider } from 'tamagui';
import { config } from '../config';

export const TestWrapper = ({ children }) => (
  <TamaguiProvider config={config}>
    {children}
  </TamaguiProvider>
);

export const renderWithProviders = (ui: React.ReactElement) =>
  render(ui, { wrapper: TestWrapper });
```

### 4.4 Set Up Storybook

Configure Storybook for the `libs/ui` package with Tamagui support. This is a one-time setup cost that pays for itself across all components:

1. Install `@storybook/react` + `@storybook/addon-essentials`
2. Configure Tamagui decorator for all stories
3. Add stories alongside components: `ComponentName.stories.tsx`
4. Optionally add Chromatic or Percy for visual regression CI

---

## 5. TDD Workflow Recommendation

The revised strategy fits TDD naturally:

```
1. Define entity type         → domain/entities/Coupon.ts
2. Define repository interface → domain/repositories/coupon.ts
3. Write mock repository       → data/mock/coupon.ts
4. Write usecase test          → domain/usecases/couponCreate.test.ts  ← RED
5. Implement usecase           → domain/usecases/couponCreate.ts       ← GREEN
6. Write Storybook stories     → presentation/components/CouponForm.stories.tsx
7. Implement component         → presentation/components/CouponForm.tsx (verify in Storybook)
8. Write handler integ. test   → presentation/screens/CouponCreateHandler.test.tsx ← RED
9. Implement handler           → presentation/screens/CouponCreateHandler.tsx      ← GREEN
10. Wire up API repository     → data/api/coupon.ts
11. Wire up in app layer       → app/CouponCreate.tsx
```

**Key difference from original TDD cycle**: Component development is driven by Storybook (visual feedback) rather than unit tests. Handler development is driven by integration tests that exercise the full stack.

---

## 6. Summary of Recommendations

| # | Action | Effort | Impact | Priority |
|---|--------|--------|--------|----------|
| 1 | Fix test isolation in existing usecase tests | Low | Medium | P0 |
| 2 | Standardize `flushPromises` usage across all usecase tests | Low | Low | P0 |
| 3 | Write handler integration tests (real usecases, mock repos, no controller mocks) | Medium | **Very High** | **P1** |
| 4 | Set up Storybook for component visual testing | Medium | High | **P1** |
| 5 | Remove controller-mocking handler tests (replaced by #3) | Low | Medium | P2 |
| 6 | Delete standalone controller tests (redundant with #3) | Low | Low | P2 |
| 7 | Keep existing transformer & URL repo tests (already written, low maintenance) | None | Medium | — |
| 8 | Add real E2E tests for critical flows (Playwright) | High | High | P3 |

**Bottom line**: Focus automated testing on **two surfaces** — usecase unit tests (logic) and handler integration tests (full-stack behavior with mock data). Use **Storybook** for visual/interaction verification of components. This gives maximum coverage with minimum test maintenance overhead. When something breaks, the usecase tests tell you if it's a logic bug; the handler tests tell you if it's a wiring/rendering bug; Storybook tells you if it's a visual bug.

---

## Appendix: Original Testing Strategy (Superseded)

The original plan proposed testing every layer independently (transformers, URL repos, controllers, components, handlers, E2E). While comprehensive, it was over-engineered for this codebase's architecture. The revised strategy above achieves comparable coverage with fewer, higher-value tests. The original plan is preserved below for reference.

<details>
<summary>Click to expand original plan</summary>

### Original Testing Pyramid

```
         /  E2E Tests  \          ← Critical user flows (Playwright)
        / Integration    \        ← Handler components with mock repos
       / Component Tests  \       ← Pure components with prop variations
      / Controller Tests   \      ← React hooks with mock usecases
     / Domain/Usecase Tests \     ← State machine logic (EXISTING ✅)
    / Data Layer Tests       \    ← API transformers, URL repos
```

The original plan had 10 action items across 6 priority levels, testing each architectural layer independently. The revised strategy consolidates this into 3 testing surfaces (usecase tests, handler integration tests, Storybook) that together provide equivalent or better coverage.

</details>
