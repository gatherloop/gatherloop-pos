import { test, expect, type Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CUSTOMER_NAME = `E2E Mobile Customer ${TS}`;
const PRODUCT_NAME = `E2E MobileTxProduct ${TS}`;
const CATEGORY_NAME = `E2E MobileTxCategory ${TS}`;
const WALLET_NAME = `E2E MobileTxWallet ${TS}`;

const PRODUCT_PRICE = 35_000;

test.describe.serial('Transaction Flow (compact / mobile layout)', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;
  let testWallet: api.Wallet;

  let createdTransactionId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, {
      name: CATEGORY_NAME,
    });

    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [
        { name: 'Size', values: [{ name: 'Standard' }, { name: 'Large' }] },
      ],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: PRODUCT_PRICE,
      materials: [],
      values: [{ optionValueId }],
    });

    testWallet = await api.createWallet(request, {
      name: WALLET_NAME,
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: true,
    });
  });

  test.afterAll(async ({ request }) => {
    if (createdTransactionId !== undefined) {
      await api.deleteTransaction(request, createdTransactionId).catch(() => {
        // Ignore — may already be gone
      });
    }
    await api.deleteVariant(request, testVariant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, testProduct.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, testCategory.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteWallet(request, testWallet.id).catch(() => {
      // Ignore — may already be gone
    });
  });

  test('should complete the compact happy path: pick product → variant → cart → submit → pay', async ({
    page,
  }: {
    page: Page;
  }) => {
    await page.goto('/transactions/create');

    await expect(sel.transactionForm.productSearchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    await expect(sel.transactionCartButton.button(page)).not.toBeVisible();

    await sel.transactionForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const productCard = sel.transactionForm.productCard(page, PRODUCT_NAME);
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit' }).last().click();
    await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

    const cartButton = sel.transactionCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(/^1 item ·/);
    await expect(productCard).toBeVisible();

    await cartButton.click();
    await expect(sel.transactionCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });

    await sel.transactionForm.customerNameInput(page).fill(CUSTOMER_NAME);
    await sel.transactionForm.orderNumberInput(page).fill('1');

    await sel.transactionForm.submitButton(page).click();

    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.transactionCartSheet.title(page)).not.toBeVisible();

    await sel.transactionPayDialog.walletSelect(page).click();
    await page
      .locator('span[data-disable-theme]')
      .filter({ hasText: WALLET_NAME })
      .click();
    await sel.transactionPayDialog.submitButton(page).click();

    const printInvoiceDialog =
      sel.transactionPrintDialog.printInvoiceDialog(page);
    await expect(printInvoiceDialog).toBeVisible({ timeout: 10_000 });
    await sel.transactionPrintDialog.clickNo(printInvoiceDialog);

    const printOrderSlipDialog =
      sel.transactionPrintDialog.printOrderSlipDialog(page);
    await expect(printOrderSlipDialog).toBeVisible({ timeout: 5_000 });
    await sel.transactionPrintDialog.clickNo(printOrderSlipDialog);

    await page.waitForURL('/transactions', { timeout: 15_000 });

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });
    await sel.transactionList.transactionItem(page, CUSTOMER_NAME).click();
    await page.waitForURL(/\/transactions\/\d+\/detail$/, { timeout: 15_000 });

    const match = page.url().match(/\/transactions\/(\d+)\/detail$/);
    if (match) {
      createdTransactionId = parseInt(match[1]);
    }
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible({
      timeout: 10_000,
    });
  });
});
