# Frontend UX Improvement Plan

## Overview

This document outlines a phased plan to improve the user experience of the Gatherloop POS frontend application. The focus is on providing clear visual feedback for user actions, smoother loading transitions, and better error/empty state handling.

Each phase is self-contained and can be shipped as an independent PR.

---

## Current State Analysis

### What's Working Well

- Clean state machine architecture with exhaustive pattern matching (`ts-pattern`)
- Field-level form validation via `react-hook-form` + `Zod` with inline error messages
- Confirmation dialogs (`AlertDialog`) for destructive delete actions
- Toast notifications on create/update/delete (success & error) via `@tamagui/toast`
- Error recovery with retry buttons on data fetch failures
- Pagination for list screens
- Search with debounce (600ms) in usecases
- Cross-platform component sharing between web and mobile via `Tamagui` + `Solito`

### UX Gaps Identified

| # | Issue | Impact | Affected Files |
|---|-------|--------|----------------|
| 1 | Submit buttons show no loading spinner - only `disabled` during submission | High | 16 `*FormView.tsx` |
| 2 | Delete alert buttons show no loading spinner - only `disabled` during deletion | High | 12 `*DeleteAlert.tsx` |
| 3 | Full-page spinner replaces entire content during initial list load | Medium | 15 `*List.tsx` / `*ListScreen.tsx` |
| 4 | Background data revalidation is invisible to users | Medium | 15 list handlers |
| 5 | Empty states have no call-to-action button | Medium | 15 `*List.tsx` / `*ListScreen.tsx` |
| 6 | Server errors on form submission only appear as a toast (easy to miss) | Medium | 16 `*FormView.tsx` |
| 7 | Search input shows no processing indicator while debouncing/fetching | Low | List screens with search |
| 8 | Many UX behaviors lack handler test coverage | High | 43 `*Handler.test.tsx` |

---

## Affected File Inventory

### FormView Components (16 files)

All located in `libs/ui/src/presentation/components/`:

- `auth/LoginFormView.tsx`
- `calculations/CalculationFormView.tsx`
- `categories/CategoryFormView.tsx`
- `checklistSessions/ChecklistSessionFormView.tsx`
- `checklistTemplates/ChecklistTemplateFormView.tsx`
- `coupons/CouponFormView.tsx`
- `expenses/ExpenseFormView.tsx`
- `materials/MaterialFormView.tsx`
- `products/ProductFormView.tsx`
- `rentals/RentalCheckinFormView.tsx`
- `rentals/RentalCheckoutFormView.tsx`
- `suppliers/SupplierFormView.tsx`
- `transactions/TransactionFormView.tsx`
- `variants/VariantFormView.tsx`
- `wallets/WalletFormView.tsx`
- `wallets/WalletTransferFormView.tsx`

### DeleteAlert Components (12 files)

All located in `libs/ui/src/presentation/components/`:

- `calculations/CalculationDeleteAlert.tsx`
- `categories/CategoryDeleteAlert.tsx`
- `checklistSessions/ChecklistSessionDeleteAlert.tsx`
- `checklistTemplates/ChecklistTemplateDeleteAlert.tsx`
- `coupons/CouponDeleteAlert.tsx`
- `expenses/ExpenseDeleteAlert.tsx`
- `materials/MaterialDeleteAlert.tsx`
- `products/ProductDeleteAlert.tsx`
- `rentals/RentalDeleteAlert.tsx`
- `suppliers/SupplierDeleteAlert.tsx`
- `transactions/TransactionDeleteAlert.tsx`
- `variants/VariantDeleteAlert.tsx`

### List Components (15 files)

All located in `libs/ui/src/presentation/components/`:

- `budgets/BudgetList.tsx`
- `calculations/CalculationList.tsx`
- `categories/CategoryList.tsx`
- `checklistSessions/ChecklistSessionList.tsx`
- `checklistTemplates/ChecklistTemplateList.tsx`
- `coupons/CouponList.tsx`
- `expenses/ExpenseList.tsx`
- `materials/MaterialList.tsx`
- `products/ProductList.tsx`
- `rentals/RentalList.tsx`
- `suppliers/SupplierList.tsx`
- `transactions/TransactionList.tsx`
- `variants/VariantList.tsx`
- `wallets/WalletList.tsx`
- `wallets/WalletTransferList.tsx`

### Handler Files (~45 files)

All located in `libs/ui/src/presentation/screens/`:
Create/Update handlers (~28 files) and List handlers (~17 files).

### Handler Test Files (~43 files)

All located in `libs/ui/src/presentation/screens/`:
Existing `*Handler.test.tsx` files that need expanded coverage.

---

## Phase 1: Form Submit Button Loading Indicators

**Goal:** Give users clear visual feedback that their form submission is being processed, instead of just a grayed-out button.

**Priority:** Highest - this is the most common user interaction in a POS system.

### Changes

#### 1.1 Add `isSubmitting` prop to all FormView components

**Current behavior:**
```tsx
// In FormView - button only gets disabled, no visual loading cue
<Button disabled={isSubmitDisabled} onPress={form.handleSubmit(onSubmit)} theme="blue">
  Submit
</Button>
```

**Target behavior:**
```tsx
// Add isSubmitting prop alongside isSubmitDisabled
<Button
  disabled={isSubmitDisabled}
  onPress={form.handleSubmit(onSubmit)}
  theme="blue"
  icon={isSubmitting ? <Spinner /> : undefined}
>
  Submit
</Button>
```

**Files to modify:** All 16 `*FormView.tsx` files
- Add `isSubmitting: boolean` to the component props
- Render `<Spinner />` inside the submit button when `isSubmitting` is true

#### 1.2 Update all Create/Update Handlers to pass `isSubmitting`

**Current behavior:**
```tsx
// Handler only passes isSubmitDisabled
isSubmitDisabled={
  productCreate.state.type === 'submitting' ||
  productCreate.state.type === 'submitSuccess'
}
```

**Target behavior:**
```tsx
// Also pass isSubmitting
isSubmitting={productCreate.state.type === 'submitting'}
isSubmitDisabled={
  productCreate.state.type === 'submitting' ||
  productCreate.state.type === 'submitSuccess'
}
```

**Files to modify:** ~28 Create/Update Handler files

#### 1.3 Add loading spinner to DeleteAlert confirmation buttons

**Current behavior:**
```tsx
// Delete alert buttons only get disabled
<Button disabled={isButtonDisabled}>No</Button>
<Button theme="active" onPress={onConfirm} disabled={isButtonDisabled}>Yes</Button>
```

**Target behavior:**
```tsx
// Show spinner on "Yes" button during deletion
<Button disabled={isButtonDisabled}>No</Button>
<Button
  theme="active"
  onPress={onConfirm}
  disabled={isButtonDisabled}
  icon={isDeleting ? <Spinner /> : undefined}
>
  Yes
</Button>
```

**Files to modify:** All 12 `*DeleteAlert.tsx` files
- Derive `isDeleting` from the existing state prop (e.g., `state.type === 'deleting'`)

#### 1.4 Add handler tests for submit loading states

**New test cases to add:**
- Assert that a loading indicator (spinner) is visible when `state.type === 'submitting'`
- Assert that the submit button is disabled during submission
- Assert that the loading indicator disappears after success or error
- Assert that the delete confirmation button shows loading during `deleting` state

**Files to modify:** Existing `*CreateHandler.test.tsx`, `*UpdateHandler.test.tsx`, and `*ListHandler.test.tsx` files (for delete)

### Estimated Scope

- ~56 files modified
- ~20 new test assertions

---

## Phase 2: Success & Error Feedback Enhancement

**Goal:** Ensure users always see clear confirmation of success/failure. Server errors should be visible inline, not just as a fleeting toast.

**Priority:** High

### Changes

#### 2.1 Add form-level error banner for server errors

**Rationale:** Toasts auto-dismiss after a few seconds and can be missed. A persistent inline banner ensures the user sees that something went wrong.

**Implementation:**
- Create a new `FormErrorBanner` base component
- Shows a red alert banner at the top of the form when there's a server error
- Message: "Failed to submit. Please try again." (or a more specific message if available)

```tsx
// New component: libs/ui/src/presentation/components/base/Form/FormErrorBanner.tsx
export const FormErrorBanner = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <XStack backgroundColor="$red2" padding="$3" borderRadius="$2" gap="$2" alignItems="center">
      <AlertCircle size="$1" color="$red10" />
      <Paragraph color="$red10">{message}</Paragraph>
    </XStack>
  );
};
```

**Files to modify:**
- New file: `FormErrorBanner.tsx`
- All 16 `*FormView.tsx` files - add `FormErrorBanner` at the top of the form
- ~28 Create/Update Handler files - pass `serverError` prop derived from `state.type === 'submitError'`

#### 2.2 Add handler tests for feedback behavior

**New test cases:**
- Assert that error banner is visible when submission fails with a server error
- Assert that error banner is NOT visible during normal form state
- Assert that toast notifications fire on success and error
- Assert that navigation occurs after successful submission

**Files to modify:** Existing `*CreateHandler.test.tsx` and `*UpdateHandler.test.tsx` files

### Estimated Scope

- ~46 files modified (1 new + 45 existing)
- ~30 new test assertions

---

## Phase 3: List Loading Skeleton & Revalidation Indicators

**Goal:** Replace jarring full-page spinners with skeleton placeholders that maintain layout structure. Show subtle indicators during background data refresh.

**Priority:** Medium

### Changes

#### 3.1 Create `SkeletonCard` and `SkeletonList` base components

**Implementation:**
- Create skeleton placeholder cards that approximate the shape of real list items
- Use Tamagui's animation system for a subtle pulse/shimmer effect
- Skeleton list renders 3-5 skeleton cards to fill the viewport

```tsx
// New file: libs/ui/src/presentation/components/base/SkeletonView.tsx
export const SkeletonCard = () => (
  <Card animation="slow" opacity={0.5} enterStyle={{ opacity: 0.3 }}>
    <YStack gap="$2" padding="$3">
      <XStack height={16} backgroundColor="$gray5" borderRadius="$2" width="60%" />
      <XStack height={12} backgroundColor="$gray4" borderRadius="$2" width="40%" />
    </YStack>
  </Card>
);

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <YStack gap="$3">
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </YStack>
);
```

**Files:** New `SkeletonView.tsx`

#### 3.2 Replace `LoadingView` with `SkeletonList` in list screens

**Current behavior:**
```tsx
// Full-page spinner replaces all content
variant.type === 'loading' ? <LoadingView title="Fetching Products..." /> : ...
```

**Target behavior:**
```tsx
// Skeleton cards maintain layout structure
variant.type === 'loading' ? <SkeletonList count={5} /> : ...
```

**Files to modify:** All 15 `*ListScreen.tsx` files (update variant rendering)

**Note:** Keep `LoadingView` for form screens (where skeleton doesn't make sense) - only replace in list contexts.

#### 3.3 Add revalidation indicator

**Implementation:**
- When `state.type === 'revalidating'`, show a subtle spinner or progress indicator near the list header (e.g., a small spinner next to the title)
- The list data remains visible - no content replacement
- This communicates "refreshing" without disrupting the user's view

**Files to modify:** All 15 `*List.tsx` components - add a conditional spinner in the header area

#### 3.4 Add handler tests for skeleton and revalidation states

**New test cases:**
- Assert that skeleton cards appear during initial loading (not a full-page spinner)
- Assert that list content remains visible during revalidation
- Assert that revalidation indicator appears and disappears appropriately

**Files to modify:** Existing `*ListHandler.test.tsx` files

### Estimated Scope

- ~32 files modified (1 new + 31 existing)
- ~15 new test assertions

---

## Phase 4: Empty State & Error State Actionability

**Goal:** Make empty and error states guide users toward their next action, instead of being dead ends with passive text.

**Priority:** Medium

### Changes

#### 4.1 Add call-to-action button to `EmptyView`

**Current behavior:**
```tsx
// Just passive text, user has to figure out what to do next
<EmptyView
  title="Oops, Product is Empty"
  subtitle="Please create a new product"
/>
```

**Target behavior:**
```tsx
// Actionable button guides the user
<EmptyView
  title="Oops, Product is Empty"
  subtitle="Please create a new product"
  actionLabel="Create Product"
  onActionPress={() => router.push('/products/create')}
/>
```

**Files to modify:**
- `EmptyView.tsx` - add optional `actionLabel` and `onActionPress` props
- All 15 `*ListScreen.tsx` / `*ListHandler.tsx` - pass the create navigation action
- All 15 `*List.tsx` - pass through the new props

#### 4.2 Enhance error view with contextual information

**Implementation:**
- Allow `ErrorView` to accept an optional error type/code to display more helpful messages
- E.g., distinguish "Network error - check your connection" from "Server error - please try again later"

**Files to modify:** `ErrorView.tsx`, list handler files (if error details are available in state)

#### 4.3 Add handler tests for empty and error state interactions

**New test cases:**
- Assert that the CTA button in empty state is visible with correct label
- Assert that clicking the CTA button navigates to the create page
- Assert that the retry button in error state triggers a re-fetch
- Assert error message content matches the error type

**Files to modify:** Existing `*ListHandler.test.tsx` files

### Estimated Scope

- ~35 files modified
- ~15 new test assertions

---

## Phase 5: Search & Filter UX Polish

**Goal:** Give users visual feedback during search and make the search input more usable.

**Priority:** Lower

### Changes

#### 5.1 Add search processing indicator

**Implementation:**
- Show a small `<Spinner />` inside or adjacent to the search input when `state.type === 'changingParams'`
- Indicates that the search is being processed (debounce + fetch)
- Disappears when results load

**Files to modify:** List components that have search: `ProductList.tsx`, `TransactionList.tsx`, `ExpenseList.tsx`, `MaterialList.tsx`, `SupplierList.tsx`, `RentalList.tsx`, `CalculationList.tsx`, `CouponList.tsx`

#### 5.2 Add clear search button

**Implementation:**
- Show an "X" icon button inside the search input when it contains text
- Clicking it clears the search query and resets the list to page 1
- Uses `<Button icon={X} circular size="$2" />` positioned inside the input

**Files to modify:** Same list components as 5.1

#### 5.3 Add handler tests for search UX

**New test cases:**
- Assert that a search indicator appears during `changingParams` state
- Assert that the clear button is visible when search has text
- Assert that clicking clear resets the search value
- Assert that search results update after debounce

**Files to modify:** `*ListHandler.test.tsx` files for screens with search

### Estimated Scope

- ~10 files modified
- ~10 new test assertions

---

## Implementation Order & PR Strategy

| PR | Phase | Description | Dependencies |
|----|-------|-------------|-------------|
| PR 1 | Phase 1 | Submit button loading indicators + delete alert spinners | None |
| PR 2 | Phase 2 | Form error banner + feedback improvements | None (can parallel with PR 1) |
| PR 3 | Phase 3 | Skeleton loading + revalidation indicators | None (can parallel with PR 1-2) |
| PR 4 | Phase 4 | Empty state CTA + error state enhancements | None (can parallel with PR 1-3) |
| PR 5 | Phase 5 | Search UX polish | None (can parallel with PR 1-4) |

All phases are independent and can be developed in parallel. However, if done sequentially, Phase 1 should go first as it has the highest user-facing impact.

---

## Testing Strategy

Each phase includes handler integration tests (`*Handler.test.tsx`) using the existing test infrastructure:

- **Mock repositories** with configurable failure modes (`setShouldFail()`)
- **React Testing Library** for rendering and assertions
- **`flushPromises()`** utility for async state transitions
- **`userEvent`** for simulating user interactions
- **`ts-pattern`** exhaustive matching ensures all states are handled

Test coverage targets per phase:
- Phase 1: Submit loading visibility, button disabled states
- Phase 2: Error banner visibility, toast assertions, navigation on success
- Phase 3: Skeleton presence during loading, content persistence during revalidation
- Phase 4: CTA button presence and navigation, retry behavior
- Phase 5: Search indicator visibility, clear button behavior

---

## Success Criteria

After all phases are implemented:

1. Every form submission shows a visible loading spinner on the submit button
2. Every delete confirmation shows a loading spinner while processing
3. Server errors display an inline banner on the form (in addition to toast)
4. List screens show skeleton placeholders instead of a full-page spinner
5. Background data refresh shows a subtle revalidation indicator
6. Empty states include a "Create New" call-to-action button
7. Search inputs show a processing indicator and a clear button
8. All UX behaviors above are covered by handler integration tests
