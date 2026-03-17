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

## 3. Testing Strategy — The Plan

### Testing Pyramid for This Architecture

```
         /  E2E Tests  \          ← Critical user flows (Playwright)
        / Integration    \        ← Handler components with mock repos
       / Component Tests  \       ← Pure components with prop variations
      / Controller Tests   \      ← React hooks with mock usecases
     / Domain/Usecase Tests \     ← State machine logic (EXISTING ✅)
    / Data Layer Tests       \    ← API transformers, URL repos
```

### 3.1 Priority 1: Fix Existing Domain Tests

**Problem**: Test coupling via shared mutable state across `it` blocks.

**Fix**: Refactor each `describe` block so the `UsecaseTester` is created in a `beforeEach` or each `it` is fully self-contained. For sequential state transition tests, chain transitions within a single `it` block or use a builder pattern.

**Recommended pattern:**

```typescript
describe('ProductListUsecase', () => {
  describe('success flow', () => {
    it('should transition idle → loading → loaded', async () => {
      const repository = new MockProductRepository();
      const queryRepo = new MockProductListQueryRepository();
      const usecase = new ProductListUsecase(repository, queryRepo, {
        products: [],
        totalItem: 0,
      });
      const tester = new UsecaseTester(usecase);

      // idle triggers FETCH → loading
      expect(tester.state.type).toBe('loading');

      // loading triggers API call → loaded
      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.products).toEqual(repository.products);
    });

    it('should revalidate on FETCH from loaded state', async () => {
      // Full setup in this test — no shared state
      const repository = new MockProductRepository();
      const queryRepo = new MockProductListQueryRepository();
      const usecase = new ProductListUsecase(repository, queryRepo, {
        products: [],
        totalItem: 0,
      });
      const tester = new UsecaseTester(usecase);
      await flushPromises(); // reach loaded

      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('revalidating');
    });
  });
});
```

### 3.2 Priority 2: Data Layer Tests (NEW)

**What to test**: API response transformers and URL query repositories.

These are pure functions / simple classes — easy to test, high value for catching API contract drift.

```typescript
// data/api/product.test.ts
describe('productTransformers', () => {
  it('should transform API product to domain product', () => {
    const apiProduct = { id: 1, name: 'Test', category: {...}, ... };
    const result = productTransformers.product(apiProduct);
    expect(result).toEqual({
      id: 1,
      name: 'Test',
      category: { id: 1, name: 'Cat1', createdAt: '...' },
      ...
    });
  });

  it('should default description to empty string when null', () => {
    const apiProduct = { ...baseProduct, description: null };
    expect(productTransformers.product(apiProduct).description).toBe('');
  });
});
```

**For URL query repositories**: Test that `getPage()`, `setPage()`, `getSearchQuery()` etc. correctly read/write URL parameters.

### 3.3 Priority 3: Controller Hook Tests (NEW)

Test that React hooks correctly bridge usecases to component state using `@testing-library/react` `renderHook`.

```typescript
// presentation/controllers/ProductListController.test.tsx
import { renderHook, act } from '@testing-library/react';

describe('useProductListController', () => {
  it('should return state and dispatch from usecase', () => {
    const mockRepo = new MockProductRepository();
    const mockQueryRepo = new MockProductListQueryRepository();
    const usecase = new ProductListUsecase(mockRepo, mockQueryRepo, {
      products: [],
      totalItem: 0,
    });

    const { result } = renderHook(() => useProductListController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });
});
```

### 3.4 Priority 4: Component Tests (NEW)

Test pure UI components render correctly for each variant. These are the most straightforward to add since components accept props — no mocking needed.

```typescript
// presentation/components/products/ProductList.test.tsx
import { render, screen } from '@testing-library/react';

describe('ProductList', () => {
  const baseProps = {
    searchValue: '',
    saleType: 'all' as const,
    onSearchValueChange: jest.fn(),
    // ... other required callbacks
  };

  it('should show loading view when variant is loading', () => {
    render(<ProductList {...baseProps} variant={{ type: 'loading' }} />);
    expect(screen.getByText('Fetching Products...')).toBeTruthy();
  });

  it('should show error view when variant is error', () => {
    render(<ProductList {...baseProps} variant={{ type: 'error' }} />);
    expect(screen.getByText('Failed to Fetch Products')).toBeTruthy();
  });

  it('should render product items when variant is loaded', () => {
    const items = [{ id: 1, name: 'Product 1', ... }];
    render(<ProductList {...baseProps} variant={{ type: 'loaded', items }} />);
    expect(screen.getByText('Product 1')).toBeTruthy();
  });
});
```

**Note**: This requires proper Tamagui/React Native test setup. A `test-setup.ts` file that configures Tamagui provider and mocks native modules will be needed.

### 3.5 Priority 5: Handler Integration Tests (NEW)

Test the orchestration logic in Handler components (e.g., "when delete succeeds, refetch the list"):

```typescript
describe('ProductListHandler', () => {
  it('should refetch product list after successful delete', async () => {
    // Render handler with mock usecases
    // Trigger delete flow
    // Assert productList.dispatch was called with { type: 'FETCH' }
  });
});
```

### 3.6 Priority 6: E2E Tests (Playwright — Expand)

Replace the placeholder tests with critical user flow tests:

1. **Authentication flow**: Login → redirect to dashboard
2. **CRUD flows**: Create product → verify in list → edit → verify changes → delete → verify removal
3. **Transaction flow**: Create transaction → pay → verify in list
4. **Search & pagination**: Search products → verify results → paginate

---

## 4. Improvements to Testing Infrastructure

### 4.1 Enhance `UsecaseTester`

The current `UsecaseTester` is good but should support:

```typescript
export class UsecaseTester<...> {
  // Existing
  usecase: UsecaseScenario;
  state: State;
  dispatch: (action: Action) => void;

  // Add: state history for debugging
  stateHistory: State[] = [];

  // Add: async helper
  async flushAsync(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Add: wait for specific state
  async waitForState(type: string, timeout = 1000): Promise<State> {
    const start = Date.now();
    while (this.state.type !== type) {
      if (Date.now() - start > timeout) throw new Error(`Timed out waiting for state ${type}`);
      await this.flushAsync();
    }
    return this.state;
  }
}
```

### 4.2 Add `flushPromises` Utility

Replace `await Promise.resolve()` (which only flushes ONE microtask) with:

```typescript
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
```

### 4.3 Component Test Setup

Create a shared test wrapper for component tests:

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

### 4.4 Coverage Configuration

Add coverage thresholds to `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/domain/': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  },
},
```

---

## 5. TDD Workflow Recommendation

For TDD compatibility, the architecture already works well because:

1. **Domain layer is pure logic** — write tests first for state transitions, then implement `getNextState`
2. **Repository interfaces as contracts** — define the interface, write mock, test the usecase, then implement the API repo
3. **Components are prop-driven** — write tests for each variant, then implement the component

**Recommended TDD cycle for a new feature (e.g., "Add Coupon"):**

```
1. Define entity type         → domain/entities/Coupon.ts
2. Define repository interface → domain/repositories/coupon.ts
3. Write usecase test          → domain/usecases/couponCreate.test.ts  ← RED
4. Implement usecase           → domain/usecases/couponCreate.ts       ← GREEN
5. Write mock repository       → data/mock/coupon.ts
6. Write component test        → presentation/components/CouponForm.test.tsx ← RED
7. Implement component         → presentation/components/CouponForm.tsx      ← GREEN
8. Write API repository        → data/api/coupon.ts
9. Wire up in app layer        → app/CouponCreate.tsx
10. Write E2E test             → apps/web-e2e/src/coupon.spec.ts
```

---

## 6. Summary of Recommendations

| # | Action | Effort | Impact | Priority |
|---|--------|--------|--------|----------|
| 1 | Fix test isolation in existing domain tests | Low | Medium | P0 |
| 2 | Add `flushPromises` utility | Low | Medium | P0 |
| 3 | Add data transformer tests | Low | High | P1 |
| 4 | Add URL query repository tests | Low | Medium | P1 |
| 5 | Add controller hook tests | Medium | Medium | P2 |
| 6 | Add component render tests (per variant) | Medium | High | P2 |
| 7 | Add handler integration tests | Medium | High | P3 |
| 8 | Add real E2E tests for critical flows | High | Very High | P3 |
| 9 | Set up coverage thresholds | Low | Medium | P2 |
| 10 | Enhance `UsecaseTester` with state history & async helpers | Low | Medium | P2 |

**Bottom line**: The domain layer testing is solid in concept but has execution issues (test coupling). The biggest gap is that the presentation and data layers — where most regressions actually occur — have zero test coverage. Adding component tests (Priority 4) and data transformer tests (Priority 2) gives the most bang for the buck.
