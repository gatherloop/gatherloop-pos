# Handler Integration Tests — Detailed Action Plan

## Overview

This plan implements **item #3** from `TESTING_REVIEW.md`: "Write handler integration tests (real usecases, mock repos, no controller mocks)".

**Key principle**: Replace the current controller-mocking approach with **real usecases backed by mock repositories**. The test chain becomes:

```
Mock Repository → Real Usecase → Real Controller → Handler → Screen → Components
```

This catches real integration bugs: state machine mismatches, controller wiring issues, race conditions between usecases, and rendering errors for all state variants.

---

## Test Infrastructure Setup

### 1. Create shared test utilities

**File**: `libs/ui/src/utils/testUtils.tsx`

```typescript
// Providers wrapper (TamaguiProvider, etc.)
// renderWithProviders() helper
// flushPromises() utility
// waitForLoadingToFinish() helper
```

### 2. Global mocks needed for all handler tests

- `solito/router` — mock `useRouter()` returning `{ push: jest.fn(), replace: jest.fn(), back: jest.fn() }`
- `@tamagui/toast` — mock `useToastController()` returning `{ show: jest.fn() }`
- `@react-navigation/native` — mock `useFocusEffect` to execute callback immediately
- `libs/ui/src/utils/usePrinter` — mock to avoid WebSocket errors (for Transaction tests)

### 3. Pattern for each test file

```typescript
// 1. Create mock repos
// 2. Create real usecases with mock repos
// 3. Pass usecases as props to Handler
// 4. render(<Handler {...usecaseProps} />)
// 5. Use act() + flushPromises() for async state transitions
// 6. Assert UI text, navigation calls, toast calls
```

---

## Screens to Test (39 Handlers)

### GROUP 1: Auth (1 handler)
### GROUP 2: Simple CRUD — List + Delete (12 handlers)
### GROUP 3: Simple CRUD — Create (11 handlers)
### GROUP 4: Simple CRUD — Update (11 handlers)
### GROUP 5: Complex Screens (4 handlers)

---

## GROUP 1: Auth

### 1. AuthLoginHandler

**Usecases**: AuthLoginUsecase
**Mock repos**: MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Initial render shows login form | Form fields (username, password) rendered |
| 2 | Successful login navigates to "/" | `router.push('/')` called after submitSuccess |
| 3 | Failed login shows error state | Error message displayed, no navigation |
| 4 | Submitting state disables form / shows loading | Submit button disabled during submitting |
| 5 | Does NOT navigate during 'loaded' state | `router.push` not called |
| 6 | Does NOT navigate during 'submitting' state | `router.push` not called |
| 7 | Does NOT navigate during 'submitError' state | `router.push` not called |

---

## GROUP 2: List + Delete Handlers

### 2. ProductListHandler

**Usecases**: ProductListUsecase, ProductDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockProductRepository, MockProductListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Products..." visible |
| 2 | Shows product list after successful fetch | Product names from mock data visible ("Product 1", "Product 2") |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Products" visible |
| 4 | Shows empty state when no products | Text "Oops, Product is Empty" visible |
| 5 | Delete confirmation modal appears when delete menu pressed | Text "Delete Product ?" visible after triggering delete |
| 6 | Delete confirmation modal hidden initially | Text "Delete Product ?" NOT in DOM |
| 7 | Cancel delete hides modal | Modal disappears after cancel |
| 8 | Confirm delete triggers deletion, then refetches list | List refetched after deletingSuccess (products still rendered) |
| 9 | Delete button disabled during deleting state | Confirm button disabled while deletion in progress |
| 10 | Shows error when delete fails | Delete error state handled (modal stays open or shows error) |
| 11 | Search filters products | Typing in search field triggers CHANGE_PARAMS with query |
| 12 | Page change triggers re-fetch | Clicking pagination triggers CHANGE_PARAMS with new page |
| 13 | Sale type filter works | Changing sale type filter triggers CHANGE_PARAMS |
| 14 | Edit menu navigates to edit page | `router.push('/products/{id}')` called |
| 15 | Item press navigates to detail/edit | `router.push('/products/{id}')` called |
| 16 | Retry button refetches on error | Pressing retry triggers FETCH action |
| 17 | Revalidating state shows products (not loading spinner) | Products still visible during revalidation |

---

### 3. CategoryListHandler

**Usecases**: CategoryListUsecase, CategoryDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockCategoryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Categories..." visible |
| 2 | Shows category list after successful fetch | "Mock Category 1", "Mock Category 2" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Categories" visible |
| 4 | Shows empty state when no categories | Text "Oops, Category is Empty" visible |
| 5 | Delete confirmation modal appears | Text "Delete Category ?" visible |
| 6 | Delete confirmation modal hidden initially | Text "Delete Category ?" NOT in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched after successful delete |
| 9 | Delete button disabled during deleting | Confirm button disabled |
| 10 | Edit menu navigates to `/categories/{id}` | Router push called with correct path |
| 11 | Item press navigates to `/categories/{id}` | Router push called |
| 12 | Retry button refetches on error | FETCH triggered on retry press |
| 13 | Delete error keeps modal open | Modal visible after delete failure |

---

### 4. CouponListHandler

**Usecases**: CouponListUsecase, CouponDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockCouponRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Coupons..." visible |
| 2 | Shows coupon list after fetch | Coupon codes "DISCOUNT10", "FIXED5000" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Coupons" visible |
| 4 | Shows empty state when no coupons | Text "Oops, Coupon is Empty" visible |
| 5 | Delete modal appears on delete menu press | Text "Delete Coupon ?" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Edit menu navigates to `/coupons/{id}` | Router push called |
| 11 | Item press navigates | Router push called |
| 12 | Retry button works | FETCH triggered |
| 13 | Delete error keeps modal open | Modal stays visible |

---

### 5. MaterialListHandler

**Usecases**: MaterialListUsecase, MaterialDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockMaterialRepository, MockMaterialListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Materials..." visible |
| 2 | Shows material list after fetch | "Material 1", "Material 2" etc. visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Materials" visible |
| 4 | Shows empty state when no materials | Text "Oops, Material is Empty" visible |
| 5 | Delete modal appears | Text "Delete Material ?" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Search filters materials (with 600ms debounce) | CHANGE_PARAMS dispatched after debounce |
| 11 | Page change triggers re-fetch | Pagination works |
| 12 | Edit menu navigates to `/materials/{id}` | Router push called |
| 13 | Retry button works | FETCH triggered |
| 14 | Delete error keeps modal open | Modal stays visible |

---

### 6. SupplierListHandler

**Usecases**: SupplierListUsecase, SupplierDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockSupplierRepository, MockSupplierListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Suppliers..." visible |
| 2 | Shows supplier list after fetch | "Supplier 1", "Supplier 2" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Suppliers" visible |
| 4 | Shows empty state when no suppliers | Text "Oops, Supplier is Empty" visible |
| 5 | Delete modal appears | Text "Delete Supplier" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Search filters suppliers (with 600ms debounce) | CHANGE_PARAMS dispatched |
| 11 | Page change triggers re-fetch | Pagination works |
| 12 | Edit menu navigates to `/suppliers/{id}` | Router push called |
| 13 | Open map menu opens maps link | Maps link opened |
| 14 | Retry button works | FETCH triggered |
| 15 | Delete error keeps modal open | Modal stays visible |

---

### 7. ExpenseListHandler

**Usecases**: ExpenseListUsecase, ExpenseDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockExpenseRepository, MockExpenseListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Expenses..." visible |
| 2 | Shows expense list after fetch | Expense data visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Expenses" visible |
| 4 | Shows empty state when no expenses | Text "Oops, Expense is Empty" visible |
| 5 | Delete modal appears | Text "Delete Expense" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Search filters expenses | CHANGE_PARAMS dispatched |
| 11 | Page change triggers re-fetch | Pagination works |
| 12 | Wallet filter changes trigger re-fetch | CHANGE_PARAMS with walletId |
| 13 | Budget filter changes trigger re-fetch | CHANGE_PARAMS with budgetId |
| 14 | Edit menu navigates to `/expenses/{id}` | Router push called |
| 15 | Retry button works | FETCH triggered |
| 16 | Delete error keeps modal open | Modal stays visible |

---

### 8. VariantListHandler

**Usecases**: VariantListUsecase, VariantDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockVariantRepository, MockVariantListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Variants..." visible |
| 2 | Shows variant list after fetch | "Variant 1", "Variant 2" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Variants" visible |
| 4 | Shows empty state when no variants | Text "Oops, Variant is Empty" visible |
| 5 | Delete modal appears | Text "Delete Variant ?" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Search filters variants (with 600ms debounce) | CHANGE_PARAMS dispatched |
| 11 | Page change triggers re-fetch | Pagination works |
| 12 | Edit menu navigates to `/variants/{id}` | Router push called |
| 13 | Retry button works | FETCH triggered |
| 14 | Delete error keeps modal open | Modal stays visible |

---

### 9. RentalListHandler

**Usecases**: RentalListUsecase, RentalDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockRentalRepository, MockRentalListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Rentals..." visible |
| 2 | Shows rental list after fetch | Rental data (codes "RENTAL001", "RENTAL002") visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Rentals" visible |
| 4 | Shows empty state when no rentals | Text "Oops, Rental is Empty" visible |
| 5 | Delete modal appears | Text "Delete Rental" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Search by code filters rentals (with 300ms debounce) | CHANGE_PARAMS dispatched |
| 11 | Checkout status filter works | CHANGE_PARAMS with checkoutStatus |
| 12 | Page change triggers re-fetch | Pagination works |
| 13 | Retry button works | FETCH triggered |
| 14 | Delete error keeps modal open | Modal stays visible |

---

### 10. CalculationListHandler

**Usecases**: CalculationListUsecase, CalculationDeleteUsecase, CalculationCompleteUsecase, AuthLogoutUsecase
**Mock repos**: MockCalculationRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Calculations..." visible |
| 2 | Shows calculation list after fetch | Calculation data visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Calculations" visible |
| 4 | Shows empty state when no calculations | Text "Oops, Calculation is Empty" visible |
| 5 | Delete modal appears | Text "Delete Calculation" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Complete modal appears on complete press | Text "Complete Calculation" visible |
| 11 | Complete modal hidden initially | Not in DOM |
| 12 | Cancel complete hides modal | Modal disappears |
| 13 | Confirm complete → refetches list | List refetched after completingSuccess |
| 14 | Complete button disabled during completing | Button disabled |
| 15 | Edit menu navigates to `/calculations/{id}` | Router push called |
| 16 | Item press navigates | Router push called |
| 17 | Retry button works | FETCH triggered |
| 18 | Delete error keeps modal open | Modal stays visible |
| 19 | Complete error keeps modal open | Modal stays visible |

---

### 11. TransactionListHandler

**Usecases**: TransactionListUsecase, TransactionDeleteUsecase, TransactionPayUsecase, TransactionUnpayUsecase, AuthLogoutUsecase
**Mock repos**: MockTransactionRepository, MockTransactionListQueryRepository, MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Transactions..." visible |
| 2 | Shows transaction list after fetch | Transaction data visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Transactions" visible |
| 4 | Shows empty state when no transactions | Text "Oops, Transaction is Empty" visible |
| 5 | Delete modal appears | Text "Delete Transaction" visible |
| 6 | Delete modal hidden initially | Not in DOM |
| 7 | Cancel delete hides modal | Modal disappears |
| 8 | Confirm delete → refetches list | List refetched |
| 9 | Delete button disabled during deleting | Button disabled |
| 10 | Pay modal appears on pay menu press | Text "Pay Transaction" visible |
| 11 | Pay modal hidden initially | Not in DOM |
| 12 | Cancel pay hides modal | Modal disappears |
| 13 | Confirm pay → refetches list | List refetched after payingSuccess |
| 14 | Pay button disabled during paying | Button disabled |
| 15 | Unpay modal appears on unpay menu press | Text "Unpay Transaction" visible |
| 16 | Unpay modal hidden initially | Not in DOM |
| 17 | Cancel unpay hides modal | Modal disappears |
| 18 | Confirm unpay → refetches list | List refetched after unpayingSuccess |
| 19 | Search filters transactions (with 600ms debounce) | CHANGE_PARAMS dispatched |
| 20 | Payment status filter works (with 600ms debounce) | CHANGE_PARAMS dispatched |
| 21 | Wallet filter works (with 600ms debounce) | CHANGE_PARAMS dispatched |
| 22 | Page change triggers re-fetch | Pagination works |
| 23 | Edit menu navigates to `/transactions/{id}` (unpaid) | Router push for unpaid transactions |
| 24 | Item press navigates to `/transactions/{id}/detail` (paid) | Router push for paid transactions |
| 25 | Print invoice menu builds correct print object | Print handler called with correct data |
| 26 | Print order slip menu builds correct print object | Print handler called with correct data |
| 27 | Retry button works | FETCH triggered |
| 28 | Delete error keeps modal open | Modal stays visible |
| 29 | Pay error keeps modal open | Modal stays visible |

---

### 12. WalletListHandler

**Usecases**: WalletListUsecase, AuthLogoutUsecase
**Mock repos**: MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Wallets..." visible |
| 2 | Shows wallet list after fetch | "Cash", "Bank Transfer" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Wallets" visible |
| 4 | Shows empty state when no wallets | Text "Oops, Wallet is Empty" visible |
| 5 | Edit menu navigates to `/wallets/{id}` | Router push called |
| 6 | Transfer menu navigates to `/wallets/{id}/transfers` | Router push called |
| 7 | Item press navigates | Router push called |
| 8 | Retry button works | FETCH triggered |

---

### 13. BudgetListHandler

**Usecases**: BudgetListUsecase, AuthLogoutUsecase
**Mock repos**: MockBudgetRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Budgets..." visible |
| 2 | Shows budget list after fetch | "Mock Budget 1", "Mock Budget 2" visible |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Budgets" visible |
| 4 | Shows empty state when no budgets | Text "Oops, Budget is Empty" visible |
| 5 | Retry button works | FETCH triggered |
| 6 | Budget data mapped correctly (name, balance, percentage) | Correct formatted values displayed |

---

## GROUP 3: Create Handlers

### 14. CategoryCreateHandler

**Usecases**: CategoryCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockCategoryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form in loaded state | Form fields visible (Name input) |
| 2 | Successful creation navigates to `/categories` | `router.push('/categories')` called |
| 3 | Failed creation shows error state | Error message displayed, no navigation |
| 4 | Does NOT navigate during 'loaded' state | Router not called |
| 5 | Does NOT navigate during 'submitting' state | Router not called |
| 6 | Does NOT navigate during 'submitError' state | Router not called |
| 7 | Submit button disabled during submitting | Button disabled |

---

### 15. CouponCreateHandler

**Usecases**: CouponCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockCouponRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form in loaded state | Form fields visible (Code, Type, Amount) |
| 2 | Successful creation navigates to `/coupons` | Router push called |
| 3 | Failed creation shows error | Error displayed, no navigation |
| 4 | Does NOT navigate during non-success states | Router not called |
| 5 | Submit button disabled during submitting | Button disabled |

---

### 16. ProductCreateHandler

**Usecases**: ProductCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockProductRepository, MockCategoryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state while fetching categories | Text "Fetching Product..." visible |
| 2 | Renders form after categories loaded | Form fields visible (Name, Category select, Image URL, etc.) |
| 3 | Shows error state when category fetch fails | Text "Failed to Fetch Product" visible |
| 4 | Successful creation navigates to `/products` | Router push called |
| 5 | Failed creation shows error | Error displayed, no navigation |
| 6 | Does NOT navigate during non-success states | Router not called |
| 7 | Retry button works on error state | Refetch triggered |
| 8 | Categories mapped to select options | Category names visible in form |

---

### 17. MaterialCreateHandler

**Usecases**: MaterialCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockMaterialRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form | Form fields visible (Name, Price, Unit) |
| 2 | Successful creation navigates to `/materials` | Router push called |
| 3 | Failed creation shows error | Error displayed, no navigation |
| 4 | Does NOT navigate during non-success states | Router not called |
| 5 | Submit button disabled during submitting | Button disabled |

---

### 18. SupplierCreateHandler

**Usecases**: SupplierCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockSupplierRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form | Form fields visible (Name, Phone, Address, Maps Link) |
| 2 | Successful creation navigates to `/suppliers` | Router push called |
| 3 | Failed creation shows error | Error displayed, no navigation |
| 4 | Does NOT navigate during non-success states | Router not called |
| 5 | Submit button disabled during submitting | Button disabled |

---

### 19. ExpenseCreateHandler

**Usecases**: ExpenseCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockExpenseRepository, MockWalletRepository, MockBudgetRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state while fetching budgets/wallets | Text "Fetching Expense..." visible |
| 2 | Renders form after data loaded | Form fields visible (Budget, Wallet, Items) |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Expense" visible |
| 4 | Successful creation navigates to `/expenses` | Router push called |
| 5 | Failed creation shows error | Error displayed, no navigation |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Budgets mapped to select options | Budget names in dropdown |
| 8 | Wallets mapped to select options | Wallet names in dropdown |

---

### 20. WalletCreateHandler

**Usecases**: WalletCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form | Form fields visible (Name, Balance, Payment Cost %, Cashless) |
| 2 | Successful creation navigates to `/wallets` | Router push called |
| 3 | Failed creation shows error | Error displayed, no navigation |
| 4 | Does NOT navigate during non-success states | Router not called |

---

### 21. WalletTransferCreateHandler

**Usecases**: WalletTransferCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching wallets | Loading state visible |
| 2 | Renders form after wallets loaded | Form fields visible (Transfer To, Amount) |
| 3 | Successful transfer navigates to `/wallets/{walletId}/transfers` | Router push with correct walletId |
| 4 | Failed transfer shows error | Error displayed |
| 5 | Current wallet excluded from "Transfer To" options | fromWalletId not in select options |

---

### 22. CalculationCreateHandler

**Usecases**: CalculationCreateUsecase, AuthLogoutUsecase
**Mock repos**: MockCalculationRepository, MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching wallets | Loading state visible |
| 2 | Renders form after data loaded | Form fields visible (Wallet, Items) |
| 3 | Shows error when fetch fails | Error state visible |
| 4 | Successful creation navigates to `/calculations` | Router push called |
| 5 | Failed creation shows error | Error displayed, no navigation |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Wallet select options rendered | Wallet names visible |
| 8 | getTotalWallet helper computes correctly | Total displayed correctly |

---

### 23. VariantCreateHandler

**Usecases**: VariantCreateUsecase, MaterialListUsecase, AuthLogoutUsecase
**Mock repos**: MockVariantRepository, MockMaterialRepository, MockMaterialListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching data | Loading state visible |
| 2 | Renders form after data loaded | Form fields visible (Name, Price) |
| 3 | Shows error when fetch fails | Error state visible |
| 4 | Successful creation navigates to `/products/{productId}` | Router push with correct productId |
| 5 | Failed creation shows error | Error displayed, no navigation |
| 6 | Material sheet opens/closes | Sheet visibility toggles |
| 7 | Add material adds to form list | Material added to variant's materials |
| 8 | Remove material removes from form list | Material removed |
| 9 | Retry button works on error | Refetch triggered |

---

### 24. TransactionCreateHandler (COMPLEX)

**Usecases**: TransactionCreateUsecase, TransactionItemSelectUsecase, TransactionPayUsecase, CouponListUsecase, AuthLogoutUsecase
**Mock repos**: MockTransactionRepository, MockProductRepository, MockVariantRepository, MockProductListQueryRepository, MockWalletRepository, MockCouponRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form with product selection | Product list visible for selection |
| 2 | Shows loading while products load | Loading state visible |
| 3 | Shows error when product fetch fails | Error state visible |
| 4 | Selecting a product with single option auto-loads variant | Variant loaded automatically |
| 5 | Selecting a product with multiple options shows option picker | Option selection UI visible |
| 6 | After variant loaded, item added to transaction form | Item appears in form |
| 7 | Deselecting product resets selection | Selection cleared |
| 8 | Search filters products | Products filtered by search query |
| 9 | Page change re-fetches products | New page of products loaded |
| 10 | Coupon sheet opens/closes | Sheet visibility toggles |
| 11 | Adding coupon adds to form | Coupon appears in form list |
| 12 | Submit creates transaction → shows pay confirmation | Payment modal appears after create success |
| 13 | Pay modal shows correct total (with coupon discounts) | Total calculated with percentage + fixed discounts |
| 14 | Successful payment → print invoice confirmation alert | Print alert shown |
| 15 | After print confirmation → navigates to `/transactions` | Router push called |
| 16 | Submit failure shows error | Error state, no payment modal |
| 17 | Payment failure shows error | Payment error state |
| 18 | Amount change updates item quantity | Quantity updated in form |
| 19 | Duplicate item increases amount instead of adding new | Same variant not duplicated |
| 20 | Retry button works on product fetch error | Product list refetched |
| 21 | Coupon discount calculation (percentage type) | Correct percentage discount applied |
| 22 | Coupon discount calculation (fixed type) | Correct fixed discount applied |
| 23 | Total rounded to nearest 500 | `roundToNearest500()` applied |

---

## GROUP 4: Update Handlers

### 25. CategoryUpdateHandler

**Usecases**: CategoryUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockCategoryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching category | Loading state visible |
| 2 | Renders form pre-filled with category data | Name field contains existing value |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Category" visible |
| 4 | Successful update navigates to `/categories` | Router push called |
| 5 | Failed update shows error | Error displayed, no navigation |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Does NOT navigate during non-success states | Router not called |

---

### 26. CouponUpdateHandler

**Usecases**: CouponUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockCouponRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching coupon | Loading state visible |
| 2 | Renders form pre-filled with coupon data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Coupon" visible |
| 4 | Successful update navigates to `/coupons` | Router push called |
| 5 | Failed update shows error | Error displayed |
| 6 | Retry button works on error | Refetch triggered |

---

### 27. ProductUpdateHandler

**Usecases**: ProductUpdateUsecase, VariantDeleteUsecase, AuthLogoutUsecase
**Mock repos**: MockProductRepository, MockCategoryRepository, MockVariantRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching product | Text "Fetching Product..." visible |
| 2 | Renders form pre-filled with product data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Product" visible |
| 4 | Successful update navigates to `/products` | Router push called |
| 5 | Failed update shows error | Error displayed, no navigation |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Variant delete confirmation appears | Delete modal visible for variant |
| 8 | Confirm variant delete → refetches product | Product refetched after variant delete |
| 9 | Cancel variant delete hides modal | Modal disappears |
| 10 | Variant edit navigates to `/products/{productId}/variants/{variantId}` | Router push called |
| 11 | Variant create navigates to `/products/{productId}/variants/create` | Router push called |
| 12 | Categories mapped to select options | Category names in dropdown |
| 13 | Does NOT navigate during 'loaded' state | Router not called |
| 14 | Does NOT navigate during 'submitting' state | Router not called |

---

### 28. MaterialUpdateHandler

**Usecases**: MaterialUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockMaterialRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form pre-filled with material data | Fields contain existing values |
| 2 | Successful update navigates to `/materials` | Router push called |
| 3 | Failed update shows error | Error displayed |
| 4 | Does NOT navigate during non-success states | Router not called |

---

### 29. SupplierUpdateHandler

**Usecases**: SupplierUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockSupplierRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form pre-filled with supplier data | Fields contain existing values |
| 2 | Successful update navigates to `/suppliers` | Router push called |
| 3 | Failed update shows error | Error displayed |
| 4 | Does NOT navigate during non-success states | Router not called |

---

### 30. ExpenseUpdateHandler

**Usecases**: ExpenseUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockExpenseRepository, MockWalletRepository, MockBudgetRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching expense | Text "Fetching Expense..." visible |
| 2 | Renders form pre-filled with expense data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Expense" visible |
| 4 | Successful update navigates to `/expenses` | Router push called |
| 5 | Failed update shows error | Error displayed |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Budgets mapped to select options | Budget names visible |
| 8 | Wallets mapped to select options | Wallet names visible |

---

### 31. WalletUpdateHandler

**Usecases**: WalletUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching wallet | Text "Fetching Wallet..." visible |
| 2 | Renders form pre-filled with wallet data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Wallet" visible |
| 4 | Successful update navigates to `/wallets` | Router push called |
| 5 | Failed update shows error | Error displayed |

---

### 32. CalculationUpdateHandler

**Usecases**: CalculationUpdateUsecase, AuthLogoutUsecase
**Mock repos**: MockCalculationRepository, MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching calculation | Text "Fetching Calculation..." visible |
| 2 | Renders form pre-filled with calculation data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Calculation" visible |
| 4 | Successful update navigates to `/calculations` | Router push called |
| 5 | Failed update shows error | Error displayed |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Wallet select options rendered | Wallet names visible |
| 8 | Submit disabled when calculation is complete (isComplete flag) | Button disabled |

---

### 33. VariantUpdateHandler

**Usecases**: VariantUpdateUsecase, MaterialListUsecase, AuthLogoutUsecase
**Mock repos**: MockVariantRepository, MockMaterialRepository, MockMaterialListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching variant | Text "Fetching Variant..." visible |
| 2 | Renders form pre-filled with variant data | Fields contain existing values |
| 3 | Shows error when fetch fails | Text "Failed to Fetch Variant" visible |
| 4 | Successful update navigates to `/products/{productId}` | Router push with correct productId |
| 5 | Failed update shows error | Error displayed |
| 6 | Retry button works on error | Refetch triggered |
| 7 | Material sheet opens/closes | Sheet visibility toggles |
| 8 | Add material adds to form list | Material added |
| 9 | Remove material removes from form list | Material removed |

---

### 34. TransactionUpdateHandler

**Usecases**: TransactionUpdateUsecase, TransactionItemSelectUsecase, CouponListUsecase, AuthLogoutUsecase
**Mock repos**: MockTransactionRepository, MockProductRepository, MockVariantRepository, MockProductListQueryRepository, MockCouponRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching transaction | Loading state visible |
| 2 | Renders form pre-filled with transaction data | Fields contain existing values |
| 3 | Shows error when fetch fails | Error state visible |
| 4 | Successful update navigates to `/transactions` | Router push called |
| 5 | Failed update shows error | Error displayed |
| 6 | Selecting product loads variant and adds item | Item added to form |
| 7 | Coupon sheet opens/closes | Sheet visibility toggles |
| 8 | Adding coupon adds to form | Coupon in form list |
| 9 | Search filters products | Products filtered |
| 10 | Retry button works on product fetch error | Refetch triggered |
| 11 | Duplicate item handling | Amount increased, not duplicated |

---

## GROUP 5: Complex / Special Handlers

### 35. TransactionDetailHandler

**Usecases**: TransactionDetailUsecase, AuthLogoutUsecase
**Mock repos**: MockTransactionRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching transaction | Loading state visible |
| 2 | Renders transaction details after fetch | Transaction name, order number, total, items, coupons visible |
| 3 | Shows error when fetch fails | Error state visible |
| 4 | Payment info displayed when transaction is paid | Wallet name, paid amount, paid date visible |
| 5 | Payment info hidden when transaction is unpaid | Payment section hidden/empty |
| 6 | Transaction items rendered with correct data | Item names, prices, amounts visible |
| 7 | Transaction coupons rendered with correct data | Coupon codes, discount amounts visible |

---

### 36. TransactionStatisticHandler

**Usecases**: TransactionStatisticListUsecase, AuthLogoutUsecase
**Mock repos**: MockTransactionRepository, MockTransactionStatisticListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading state initially | Text "Fetching Statistics..." visible |
| 2 | Shows statistics after successful fetch | Chart data rendered (dates, totals) |
| 3 | Shows error state when fetch fails | Text "Failed to Fetch Statistics" visible |
| 4 | Group by change triggers re-fetch | New groupBy parameter dispatched |
| 5 | Retry button works on error | FETCH triggered |
| 6 | Statistics data mapped correctly (y: total, x: date) | Correct axis values |

---

### 37. RentalCheckinHandler (COMPLEX)

**Usecases**: RentalCheckinUsecase, TransactionItemSelectUsecase, AuthLogoutUsecase
**Mock repos**: MockRentalRepository, MockProductRepository, MockVariantRepository, MockProductListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Renders form with product selection | Product list visible |
| 2 | Shows loading while products load | Loading state visible |
| 3 | Selecting product with single option auto-loads variant | Variant loaded |
| 4 | Selecting product with multiple options shows option picker | Options UI visible |
| 5 | After variant loaded, rental item added to form | Item in form list |
| 6 | Deselecting product resets selection | Selection cleared |
| 7 | Search filters products | Products filtered |
| 8 | Successful checkin navigates to `/rentals` | Router push called |
| 9 | Failed checkin shows error | Error state |
| 10 | Toggle customize checkin datetime | DateTime fields appear/disappear |
| 11 | Amount change updates quantity | Amount updated |
| 12 | Retry button on product fetch error | Refetch triggered |
| 13 | Page change re-fetches products | New page loaded |

---

### 38. RentalCheckoutHandler (COMPLEX)

**Usecases**: RentalCheckoutUsecase, RentalListUsecase, AuthLogoutUsecase
**Mock repos**: MockRentalRepository, MockRentalListQueryRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while rental list loads | Loading state visible |
| 2 | Shows rental list after fetch | Rental data visible |
| 3 | Shows error when rental fetch fails | Error state visible |
| 4 | Pressing rental item adds to checkout form | Rental added to form |
| 5 | Duplicate rental not added twice | Already-added rental ignored |
| 6 | Search by code filters rentals | Rentals filtered |
| 7 | Successful checkout navigates to `/transactions/{transactionId}` | Router push with transaction ID |
| 8 | Failed checkout shows error | Error state |
| 9 | Page change re-fetches rentals | New page loaded |
| 10 | Checkout status filter defaults to 'ongoing' | Only ongoing rentals shown |
| 11 | Retry button works | Refetch triggered |

---

### 39. WalletTransferListHandler

**Usecases**: WalletDetailUsecase, WalletTransferListUsecase, AuthLogoutUsecase
**Mock repos**: MockWalletRepository, MockAuthRepository

| # | Test Case | What to Assert |
|---|-----------|----------------|
| 1 | Shows loading while fetching wallet + transfers | Loading state visible |
| 2 | Shows wallet detail after fetch | Wallet name, balance visible |
| 3 | Shows transfer list after fetch | Transfer data visible |
| 4 | Shows error when fetch fails | Text "Failed to Fetch Transfer Histories" visible |
| 5 | Shows empty state when no transfers | Text "Oops, Transfer History is Empty" visible |
| 6 | Retry button works | Refetch triggered |
| 7 | Transfer data mapped correctly (amount, from/to wallet names) | Correct values displayed |

---

## Implementation Order (Recommended)

### Phase 1: Infrastructure + Simple handlers (fastest feedback loop)
1. Test utilities (`testUtils.tsx`, global mocks)
2. `AuthLoginHandler.test.tsx` (simplest, 1 usecase)
3. `CategoryListHandler.test.tsx` (simple list + delete pattern)
4. `CategoryCreateHandler.test.tsx` (simple create pattern)
5. `CategoryUpdateHandler.test.tsx` (simple update pattern)

### Phase 2: Standard CRUD handlers (repeat pattern)
6. `ProductListHandler.test.tsx`
7. `ProductCreateHandler.test.tsx`
8. `ProductUpdateHandler.test.tsx`
9. `CouponListHandler.test.tsx`, `CouponCreateHandler.test.tsx`, `CouponUpdateHandler.test.tsx`
10. `MaterialListHandler.test.tsx`, `MaterialCreateHandler.test.tsx`, `MaterialUpdateHandler.test.tsx`
11. `SupplierListHandler.test.tsx`, `SupplierCreateHandler.test.tsx`, `SupplierUpdateHandler.test.tsx`
12. `ExpenseListHandler.test.tsx`, `ExpenseCreateHandler.test.tsx`, `ExpenseUpdateHandler.test.tsx`
13. `VariantListHandler.test.tsx`, `VariantCreateHandler.test.tsx`, `VariantUpdateHandler.test.tsx`

### Phase 3: Financial + Complex handlers
14. `WalletListHandler.test.tsx`, `WalletCreateHandler.test.tsx`, `WalletUpdateHandler.test.tsx`
15. `WalletTransferListHandler.test.tsx`, `WalletTransferCreateHandler.test.tsx`
16. `BudgetListHandler.test.tsx`
17. `CalculationListHandler.test.tsx`, `CalculationCreateHandler.test.tsx`, `CalculationUpdateHandler.test.tsx`

### Phase 4: Most complex handlers (require multi-usecase coordination)
18. `TransactionListHandler.test.tsx`
19. `TransactionDetailHandler.test.tsx`
20. `TransactionStatisticHandler.test.tsx`
21. `TransactionCreateHandler.test.tsx` (most complex)
22. `TransactionUpdateHandler.test.tsx`
23. `RentalListHandler.test.tsx`
24. `RentalCheckinHandler.test.tsx`
25. `RentalCheckoutHandler.test.tsx`

---

## Total Test Case Count

| Group | Handlers | Test Cases |
|-------|----------|------------|
| Auth | 1 | 7 |
| List + Delete | 12 | 173 |
| Create | 11 | 96 |
| Update | 10 | 82 |
| Complex/Special | 5 | 54 |
| **TOTAL** | **39** | **~412** |

---

## Files to Create/Modify

### New Files (39 test files + 1 utility):
- `libs/ui/src/utils/testUtils.tsx` — shared test helpers
- `libs/ui/src/presentation/screens/*Handler.test.tsx` × 39

### Files to Delete (after new tests are in place):
- Existing controller-mocking handler tests (7 files) — replaced by real integration tests
- Existing standalone controller tests — made redundant by handler integration tests

### No modifications needed to:
- Handler files (testing as-is)
- Screen files (testing as-is)
- Controller files (used as real code, not mocked)
- Usecase files (used as real code)
- Mock repository files (used as-is for test data)
