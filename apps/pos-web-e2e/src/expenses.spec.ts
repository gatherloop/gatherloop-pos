import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const WALLET_NAME = `E2E Expense Wallet ${TS}`;
const BUDGET_NAME = `E2E Budget ${TS}`;
const ITEM_NAME = `E2E Item ${TS}`;
const ITEM_UNIT = 'pcs';
const ITEM_PRICE = 25_000;
const ITEM_AMOUNT = 2;

const WALLET_INITIAL_BALANCE = 1_000_000;
const BUDGET_PERCENTAGE = 10;

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
    });
  });

  test.afterAll(async ({ request }) => {
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

  test('should create a budget with a name and target percentage', async ({
    page,
  }) => {
    await page.goto('/budgets');

    await expect(sel.budgetList.budgetItem(page, BUDGET_NAME)).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      sel.budgetList.budgetTargetPercentage(page, BUDGET_NAME)
    ).toContainText(`${BUDGET_PERCENTAGE}%`, { timeout: 15_000 });
  });

  test('should create an expense linked to the budget and wallet', async ({
    page,
  }) => {
    await page.goto('/expenses/create');

    await expect(sel.expenseForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.expenseForm.walletSelect(page).click();
    await page.getByText(WALLET_NAME, { exact: true }).click();

    await sel.expenseForm.budgetSelect(page).click();
    await page.getByText(BUDGET_NAME, { exact: true }).click();

    await sel.expenseForm.addItemButton(page).click();

    await sel.expenseForm.itemNameInput(page).fill(ITEM_NAME);
    await sel.expenseForm.itemUnitInput(page).fill(ITEM_UNIT);

    await sel.expenseForm.itemAmountInput(page).fill(String(ITEM_AMOUNT));
    await sel.expenseForm.itemPriceInput(page).fill(String(ITEM_PRICE));

    await sel.expenseForm.submitButton(page).click();

    await page.waitForURL('/expenses', { timeout: 15_000 });
    await expect(page).toHaveURL('/expenses');
  });

  test('should display the expense in the expense list', async ({ page }) => {
    await page.goto('/expenses');

    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    await sel.expenseList.expenseItemByBudget(page, BUDGET_NAME).click();
    await page.waitForURL(/\/expenses\/\d+$/, { timeout: 15_000 });
    const urlMatch = page.url().match(/\/expenses\/(\d+)$/);
    // eslint-disable-next-line playwright/no-conditional-in-test
    testExpenseId = urlMatch ? parseInt(urlMatch[1]) : undefined;
  });

  test('should filter expenses by wallet', async ({ page }) => {
    await page.goto('/expenses');

    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });

    await sel.expenseList.filterButton(page).click();

    await page.getByLabel(WALLET_NAME, { exact: true }).click();

    await page.waitForURL(/walletId=/, { timeout: 15_000 });

    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should filter expenses by budget', async ({ page }) => {
    await page.goto(`/expenses?budgetId=${testBudget.id}`);

    await expect(page).toHaveURL(new RegExp(`budgetId=${testBudget.id}`));

    await expect(
      sel.expenseList.expenseItemByBudget(page, BUDGET_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should verify the budget target is unaffected by the expense', async ({
    page,
  }) => {
    await page.goto('/budgets');

    await expect(sel.budgetList.budgetItem(page, BUDGET_NAME)).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      sel.budgetList.budgetTargetPercentage(page, BUDGET_NAME)
    ).toContainText(`${BUDGET_PERCENTAGE}%`, { timeout: 15_000 });
  });
});
