# Storybook Implementation Plan for gatherloop-pos

## Overview

Set up Storybook 8 for the `libs/ui` library using **Vite + React** builder with **react-native-web** aliases so Tamagui components render correctly in the browser. Stories will serve as visual documentation and interaction testing for all components and screens.

---

## Phase 0: Storybook Infrastructure Setup

### 0.1 Install Dependencies

Add to root `package.json` devDependencies:

```
@storybook/react-vite (v8)
@storybook/react
@storybook/addon-essentials
@storybook/addon-interactions
@storybook/addon-a11y
@storybook/test
storybook
@tamagui/vite-plugin
```

### 0.2 Create `.storybook/` config directory at `libs/ui/.storybook/`

**Files to create:**

1. **`libs/ui/.storybook/main.ts`** — Storybook config
   - Framework: `@storybook/react-vite`
   - Stories glob: `../src/**/*.stories.@(ts|tsx)`
   - Addons: essentials, interactions, a11y
   - Vite config customization:
     - Add `@tamagui/vite-plugin` with `{ components: ['tamagui'] }`
     - Alias `react-native` → `react-native-web` (for Tamagui cross-platform compat)
     - Alias `react-native-svg` → `react-native-svg-web` (if needed)
     - Add `define: { 'process.env': {} }` for RN compatibility

2. **`libs/ui/.storybook/preview.tsx`** — Global decorators
   - Wrap all stories in `<TamaguiProvider config={tamaguiConfig}>`
   - Import Tamagui CSS reset if needed
   - Set up default viewport presets (mobile, tablet, desktop)
   - Add `<PortalProvider>` for Sheet/Popover components
   - Provide mock implementations for navigation (solito `Link` → plain `<a>`)

3. **`libs/ui/.storybook/tsconfig.json`** — Extend the lib tsconfig with storybook paths

### 0.3 Add Nx target for Storybook

Update `libs/ui/project.json` to add:
```json
{
  "targets": {
    "storybook": {
      "command": "storybook dev -p 6006 -c libs/ui/.storybook"
    },
    "build-storybook": {
      "command": "storybook build -c libs/ui/.storybook -o dist/storybook/ui"
    }
  }
}
```

### 0.4 Handle platform-specific components

Create mock/stub files or Storybook webpack aliases for:
- `Focusable/index.native.tsx` → excluded (web version used automatically)
- `Markdown/index.native.tsx` → excluded
- `Chart/index.native.ts` → excluded

Since the project already has `.tsx` (web) and `.native.tsx` (RN) split, Storybook's Vite resolver will naturally pick the `.tsx` web version — no extra config needed beyond the `react-native` → `react-native-web` alias.

### 0.5 Verify setup works

Create a single smoke-test story (`EmptyView.stories.tsx`) to validate:
- Tamagui provider is working (styles render)
- Icons render (@tamagui/lucide-icons)
- Storybook dev server starts cleanly

**Deliverable: `nx run ui:storybook` launches successfully with one story.**

---

## Phase 1: Base Component Stories (Foundation)

Priority: These are reused everywhere, so story-ify them first.

### 1.1 Simple display components (no external deps)
| Component | File | Complexity |
|-----------|------|------------|
| EmptyView | `base/EmptyView.tsx` | Low — static props |
| ErrorView | `base/ErrorView.tsx` | Low — static props + action |
| LoadingView | `base/LoadingView.tsx` | Low — no props |
| ListItem | `base/ListItem.tsx` | Low |
| Tabs | `base/Tabs.tsx` | Low |

### 1.2 Layout & navigation components
| Component | File | Complexity |
|-----------|------|------------|
| Navbar | `base/Navbar/Navbar.tsx` | Medium — needs navigation mock |
| Sidebar | `base/Sidebar/Sidebar.tsx` | Medium — has state, navigation links |
| Layout | `base/Layout.tsx` | Medium — composes Navbar + Sidebar |
| Pagination | `base/Pagination/Pagination.tsx` | Medium — interactive |

### 1.3 Form components (need `react-hook-form` FormProvider wrapper)
| Component | File | Complexity |
|-----------|------|------------|
| Field | `base/Form/Field.tsx` | Medium |
| InputText | `base/Form/InputText.tsx` | Medium |
| InputNumber | `base/Form/InputNumber.tsx` | Medium |
| Textarea | `base/Form/Textarea.tsx` | Medium |
| Select | `base/Form/Select.tsx` | Medium |
| Switch | `base/Form/Switch.tsx` | Medium |
| ErrorMessage | `base/Form/ErrorMessage.tsx` | Low |
| FieldArray | `base/Form/FieldArray.tsx` | High |
| FieldWatch | `base/Form/FieldWatch.tsx` | Medium |
| MarkdownEditor | `base/Form/MarkdownEditor.tsx` | High — platform-specific |

### 1.4 Overlay components
| Component | File | Complexity |
|-----------|------|------------|
| Sheet | `base/Sheet/Sheet.tsx` | Medium — needs PortalProvider |
| ConfirmationAlert | `base/ConfirmationAlert/` | Medium — context-based |

### Story conventions for this phase:
- Each story file: `<ComponentName>.stories.tsx` next to the component
- Export a `default` meta with `title: 'Base/<ComponentName>'`
- Variants: `Default`, `WithProps`, error states, edge cases
- Form components: create a decorator that wraps in `<FormProvider>` with `useForm()`
- Use `args` / `argTypes` for interactive controls

**Deliverable: ~20 base component stories, all rendering correctly.**

---

## Phase 2: Feature Component Stories — CRUD Modules

Each feature module follows a consistent pattern:
- `*List.tsx` — list with search/filter/pagination
- `*ListItem.tsx` — individual row
- `*FormView.tsx` — create/edit form
- `*DeleteAlert.tsx` — deletion confirmation

### Strategy: Template approach
Create a **story template/helper** since all modules share the same pattern. For each module, we need:
1. Mock data matching the domain types
2. Stories for List (loading, loaded, empty, error states)
3. Stories for ListItem (with different data)
4. Stories for FormView (empty/create mode, populated/edit mode, validation errors)
5. Stories for DeleteAlert (open, disabled)

### Phase 2a: First 3 modules (establish pattern)
| Module | Components | Notes |
|--------|-----------|-------|
| **Products** | ProductList, ProductListItem, ProductFormView, ProductDeleteAlert | Has SaleType filter |
| **Categories** | CategoryList, CategoryListItem, CategoryFormView, CategoryDeleteAlert | Simplest CRUD |
| **Materials** | MaterialList, MaterialListItem, MaterialFormView, MaterialDeleteAlert | Standard CRUD |

### Phase 2b: Financial modules
| Module | Components |
|--------|-----------|
| **Transactions** | TransactionList, TransactionListItem, TransactionFormView, TransactionDetail, TransactionItemSelect, TransactionDeleteAlert, TransactionPaymentAlert, TransactionUnpayAlert, TransactionPrintCustomer, TransactionPrintEmployee, TransactionStatistic |
| **Expenses** | ExpenseList, ExpenseListItem, ExpenseFormView, ExpenseDeleteAlert |
| **Wallets** | WalletList, WalletListItem, WalletFormView, WalletTransferList, WalletTransferListItem, WalletTransferFormView |

### Phase 2c: Remaining modules
| Module | Components |
|--------|-----------|
| **Coupons** | CouponList, CouponListItem, CouponFormView, CouponDeleteAlert |
| **Budgets** | BudgetList, BudgetListItem |
| **Calculations** | CalculationList, CalculationListItem, CalculationFormView, CalculationDeleteAlert, CalculationCompleteAlert |
| **Rentals** | RentalList, RentalListItem, RentalDeleteAlert, RentalCheckinFormView, RentalCheckoutFormView |
| **Suppliers** | SupplierList, SupplierListItem, SupplierFormView, SupplierDeleteAlert |
| **Variants** | VariantList, VariantListItem, VariantFormView, VariantDeleteAlert |
| **Auth** | LoginFormView |

**Deliverable per sub-phase: All components in each module group have stories with multiple state variants.**

---

## Phase 3: Screen Stories

Screens compose components into full pages. Since screens are **pure presentational** (all props passed in), they're straightforward to story-ify.

### Approach:
- One story file per screen (39 screens total)
- Each story passes mock props simulating different states
- Use Storybook's `layout: 'fullscreen'` for screen stories
- Group under `title: 'Screens/<Feature>/<ScreenName>'`

### Phase 3a: List screens (13 screens)
ProductListScreen, CategoryListScreen, MaterialListScreen, TransactionListScreen, ExpenseListScreen, CouponListScreen, WalletListScreen, BudgetListScreen, CalculationListScreen, RentalListScreen, SupplierListScreen, VariantListScreen, plus WalletTransferListScreen

### Phase 3b: Create/Update screens (24 screens)
All `*CreateScreen` and `*UpdateScreen` variants

### Phase 3c: Special screens
TransactionDetailScreen, AuthLoginScreen, RentalCheckinScreen, RentalCheckoutScreen

**Deliverable: All 39 screens have at least one story each.**

---

## Phase 4: Polish & CI Integration

### 4.1 Add interaction tests
- Use `@storybook/test` (`expect`, `userEvent`) for key interactions:
  - Form submission flows
  - Delete confirmation flow
  - Search/filter interactions
  - Pagination clicks

### 4.2 Add `build-storybook` to CI
- Add to CI pipeline: `nx run ui:build-storybook`
- This catches rendering errors in PRs

### 4.3 Optional: Chromatic or static deploy
- Deploy built storybook as static site for team review
- Or integrate Chromatic for visual regression testing

---

## Mock Data Strategy

Create `libs/ui/.storybook/mocks/` with:
- `mockProducts.ts`, `mockCategories.ts`, etc. — reusable across stories and tests
- `mockNavigation.ts` — stub for solito Link/router
- `decorators.ts` — shared decorators (TamaguiProvider, FormProvider wrappers)

---

## File naming convention

```
libs/ui/src/presentation/components/base/EmptyView.tsx
libs/ui/src/presentation/components/base/EmptyView.stories.tsx  ← co-located

libs/ui/src/presentation/screens/ProductListScreen.tsx
libs/ui/src/presentation/screens/ProductListScreen.stories.tsx  ← co-located
```

---

## Summary & Effort Estimate

| Phase | Scope | Stories |
|-------|-------|---------|
| Phase 0 | Infrastructure + smoke test | 1 |
| Phase 1 | Base components | ~20 |
| Phase 2a | Products, Categories, Materials | ~15 |
| Phase 2b | Transactions, Expenses, Wallets | ~25 |
| Phase 2c | Remaining 7 modules + Auth | ~30 |
| Phase 3a | List screens | ~13 |
| Phase 3b | Create/Update screens | ~24 |
| Phase 3c | Special screens | ~4 |
| Phase 4 | Interaction tests + CI | — |
| **Total** | | **~132 story files** |

Each phase is independently shippable and testable. Phase 0 is the critical foundation — everything else builds on it incrementally.
