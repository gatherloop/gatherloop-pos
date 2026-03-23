/**
 * Phase 6: Expense & Budget Flow
 *
 * Tests expense tracking against budgets end-to-end.
 * Tests run serially — each builds on the previous test's state.
 *
 * Flows tested:
 * - Verifying a budget created via API appears in the budget list with correct balance
 * - Creating an expense via UI linked to a budget and wallet
 * - Verifying the expense appears in the expense list
 * - Filtering expenses by wallet
 * - Filtering expenses by budget
 * - Verifying the budget balance decreased after the expense was recorded
 *
 * Why this matters:
 * - Cross-entity relationship: expense ↔ budget ↔ wallet
 * - Financial tracking accuracy matters for business reporting
 * - Filtering is a key user workflow for expense management
 * - Authentication is handled via storageState from global-setup.ts
 *
 * Note: There is no budget creation UI (/budgets is read-only), so the test
 * wallet and budget are created via API in beforeAll. Test 1 verifies that the
 * API-created budget appears correctly in the UI — covering the SSR rendering
 * pipeline for the budget list page.
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// Unique names keyed by timestamp to avoid collisions with existing data
const TS = Date.now();
const WALLET_NAME = `E2E Expense Wallet ${TS}`;
const BUDGET_NAME = `E2E Budget ${TS}`;
const ITEM_NAME = `E2E Item ${TS}`;
const ITEM_UNIT = 'pcs';
const ITEM_PRICE = 25_000;
const ITEM_AMOUNT = 2;
const EXPENSE_TOTAL = ITEM_PRICE * ITEM_AMOUNT; // 50_000

// Balances must exceed EXPENSE_TOTAL so the API doesn't reject the expense
const WALLET_INITIAL_BALANCE = 1_000_000;
const BUDGET_INITIAL_BALANCE = 1_000_000;
const BUDGET_PERCENTAGE = 10;

// Expected budget balance after the expense is created
const BUDGET_BALANCE_AFTER = BUDGET_INITIAL_BALANCE - EXPENSE_TOTAL; // 950_000

// Indonesian locale number format: 1000000 → "1.000.000"
function formatRupiah(amount: number): string {
  return `Rp. ${amount.toLocaleString('id')}`;
}

test.describe.serial('Expense & Budget Flow', () => {
  let testWallet: api.Wallet;
  let testBudget: api.Budget;
  let testExpenseId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testWallet = await api.createWallet(request, {
      name: WALLET_NAME,
      balance: WALLET_INITIAL_BALANCE,
      paymentCostPercentage: 0,
      isCashless: false,
    });
    testBudget = await api.createBudget(request, {
      name: BUDGET_NAME,
      percentage: BUDGET_PERCENTAGE,
      balance: BUDGET_INITIAL_BALANCE,
    });
  });

  test.afterAll(async ({ request }) => {
    // Delete the expense first — this refunds both the budget and wallet balance
    if (testExpenseId !== undefined) {
      await api.deleteExpense(request, testExpenseId).catch(() => {
        // Ignore — expense may already be gone
      });
    }
    await api.deleteWallet(request, testWallet.id).catch(() => {
      // Ignore — wallet may already be gone
    });
    await api.deleteBudget(request, testBudget.id).catch(() => {
      // Ignore — budget may already be gone
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: Budget appears in the list with correct balance
  // ---------------------------------------------------------------------------

  test('should create a budget with a name and amount', async ({ page }) => {
    await page.goto('/budgets');

    // The API-created budget should appear in the list
    await expect(sel.budgetList.budgetItem(page, BUDGET_NAME)).toBeVisible({
      timeout: 15_000,
    });

    // Its balance subtitle should match what we passed to the API
    await expect(
      sel.budgetList.budgetBalance(page, BUDGET_NAME)
    ).toContainText(formatRupiah(BUDGET_INITIAL_BALANCE), { timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Create an expense linked to the budget and wallet
  // ---------------------------------------------------------------------------

  test('should create an expense linked to the budget and wallet', async ({
    page,
  }) => {
    await page.goto('/expenses/create');

    // Wait for the form to be fully loaded (wallets and budgets fetched)
    await expect(sel.expenseForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    // ── Select wallet ─────────────────────────────────────────────────────────
    await sel.expenseForm.walletSelect(page).click();
    await page.getByText(WALLET_NAME, { exact: true }).click();

    // ── Select budget ─────────────────────────────────────────────────────────
    await sel.expenseForm.budgetSelect(page).click();
    await page.getByText(BUDGET_NAME, { exact: true }).click();

    // ── Add an expense item ───────────────────────────────────────────────────
    // The form starts with no items; click "+" to append the first row
    await sel.expenseForm.addItemButton(page).click();

    // Fill in the item fields
    await sel.expenseForm.itemNameInput(page).fill(ITEM_NAME);
    await sel.expenseForm.itemUnitInput(page).fill(ITEM_UNIT);

    // Clear and fill numeric fields (they may have a default placeholder value)
    await sel.expenseForm.itemAmountInput(page).fill(String(ITEM_AMOUNT));
    await sel.expenseForm.itemPriceInput(page).fill(String(ITEM_PRICE));

    // ── Submit ────────────────────────────────────────────────────────────────
    await sel.expenseForm.submitButton(page).click();

    // After a successful submit, the handler redirects to /expenses
    await page.waitForURL('/expenses', { timeout: 15_000 });
    await expect(page).toHaveURL('/expenses');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Expense appears in the expense list
  // ---------------------------------------------------------------------------

  test('should display the expense in the expense list', async ({ page }) => {
    await page.goto('/expenses');

    // The expense list item title is the budget name
    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Capture the expense ID for cleanup — click the item to navigate to its
    // detail page, then extract the ID from the URL
    await sel.expenseList.expenseItemByBudget(page, BUDGET_NAME).click();
    await page.waitForURL(/\/expenses\/\d+$/, { timeout: 15_000 });
    const urlMatch = page.url().match(/\/expenses\/(\d+)$/);
    // eslint-disable-next-line playwright/no-conditional-in-test
    testExpenseId = urlMatch ? parseInt(urlMatch[1]) : undefined;
  });

  // ---------------------------------------------------------------------------
  // Test 4: Filter expenses by wallet
  // ---------------------------------------------------------------------------

  test('should filter expenses by wallet', async ({ page }) => {
    await page.goto('/expenses');

    // The unfiltered list should include our expense
    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Open the filter popover
    await sel.expenseList.filterButton(page).click();

    // Select our wallet via its radio label
    await page.getByLabel(WALLET_NAME, { exact: true }).click();

    // The URL should now include the walletId query parameter
    await page.waitForURL(/walletId=/, { timeout: 15_000 });

    // Our expense should still be visible after applying the wallet filter
    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Filter expenses by budget
  // ---------------------------------------------------------------------------

  test('should filter expenses by budget', async ({ page }) => {
    // Navigate directly to the budget-filtered URL.
    // The filter popover's budget section may be hidden due to the 200px
    // height constraint on Popover.Content when there are many wallet options —
    // so we test the filtering at the URL/SSR level instead of via popover UI.
    await page.goto(`/expenses?budgetId=${testBudget.id}`);

    // The URL should include the budgetId query parameter
    await expect(page).toHaveURL(new RegExp(`budgetId=${testBudget.id}`));

    // Our expense should be visible when filtered to its budget
    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Budget balance decreases after the expense is recorded
  // ---------------------------------------------------------------------------

  test('should verify budget reflects the expense amount', async ({ page }) => {
    await page.goto('/budgets');

    // The budget should still appear in the list
    await expect(sel.budgetList.budgetItem(page, BUDGET_NAME)).toBeVisible({
      timeout: 15_000,
    });

    // Its balance should have decreased by EXPENSE_TOTAL
    await expect(
      sel.budgetList.budgetBalance(page, BUDGET_NAME)
    ).toContainText(formatRupiah(BUDGET_BALANCE_AFTER), { timeout: 15_000 });
  });
});
