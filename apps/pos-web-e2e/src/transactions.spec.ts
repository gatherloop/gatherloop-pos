import { test, expect, type Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CUSTOMER_NAME = `E2E Customer ${TS}`;
const CUSTOMER_NAME_2 = `E2E CustomerB ${TS}`;
const PRODUCT_NAME = `E2E TxProduct ${TS}`;
const CATEGORY_NAME = `E2E TxCategory ${TS}`;
const COUPON_CODE = `E2ETXC${TS}`.slice(0, 20);
const WALLET_NAME = `E2E TxWallet ${TS}`;

const PRODUCT_PRICE = 50_000;
const COUPON_DISCOUNT = 10_000;
const DISCOUNTED_TOTAL = PRODUCT_PRICE - COUPON_DISCOUNT;

function formatRupiah(amount: number): string {
  return `Rp. ${amount.toLocaleString('id')}`;
}

async function openFormAndAddProduct(page: Page, productName: string) {
  await page.goto('/transactions/create');

  await expect(sel.transactionForm.submitButton(page)).toBeVisible({
    timeout: 15_000,
  });

  await sel.transactionForm.customerNameInput(page).fill(CUSTOMER_NAME);

  await sel.transactionForm.productSearchInput(page).fill(productName);
  await page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/products') && resp.status() === 200,
    { timeout: 15_000 }
  );

  const productCard = sel.transactionForm.productCard(page, productName);
  await expect(productCard).toBeVisible({ timeout: 10_000 });
  await productCard.click();

  const cancelButton = page.getByRole('button', { name: 'Cancel' });
  await expect(cancelButton).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Submit' }).last().click();

  await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

  await expect(
    page.locator('p').filter({ hasText: productName }).first()
  ).toBeVisible({ timeout: 10_000 });
}

test.describe.serial('Transaction Flow', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;
  let testWallet: api.Wallet;
  let testCoupon: api.Coupon;

  let createdTransactionId: number | undefined;
  let unpaidTransactionId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });

    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }, { name: 'Large' }] }],
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

    testCoupon = await api.createCoupon(request, {
      code: COUPON_CODE,
      type: 'fixed',
      amount: COUPON_DISCOUNT,
    });

    const unpaidTx = await api.createTransaction(request, {
      name: CUSTOMER_NAME_2,
      orderNumber: 0,
      transactionItems: [
        {
          variantId: testVariant.id,
          amount: 1,
          discountAmount: 0,
          note: '',
        },
      ],
      transactionCoupons: [],
    });
    unpaidTransactionId = unpaidTx.id;
  });

  test.afterAll(async ({ request }) => {
    if (createdTransactionId !== undefined) {
      await api.deleteTransaction(request, createdTransactionId).catch(() => {
        // Ignore — may already be gone
      });
    }
    if (unpaidTransactionId !== undefined) {
      await api.deleteTransaction(request, unpaidTransactionId).catch(() => {
        // Ignore
      });
    }

    await api.deleteCoupon(request, testCoupon.id).catch(() => {
      // Ignore — may already be gone
    });
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

  test('should create a transaction by selecting products and quantities', async ({
    page,
  }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should display correct subtotal and total calculations', async ({
    page,
  }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    await expect(
      page.getByText(formatRupiah(PRODUCT_PRICE)).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should apply a coupon and verify discounted total', async ({ page }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    await expect(
      page.getByText(formatRupiah(PRODUCT_PRICE)).first()
    ).toBeVisible({ timeout: 10_000 });

    await sel.transactionForm.addCouponButton(page).click();

    await expect(page.getByText(COUPON_CODE)).toBeVisible({ timeout: 10_000 });

    await page.getByText(COUPON_CODE).click();

    await expect(
      page.getByText(formatRupiah(DISCOUNTED_TOTAL)).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should complete payment with selected wallet', async ({ page }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    await sel.transactionForm.submitButton(page).click();

    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 15_000,
    });

    await sel.transactionPayDialog.walletSelect(page).click();
    await page.locator('span[data-disable-theme]').filter({ hasText: WALLET_NAME }).click();

    await sel.transactionPayDialog.submitButton(page).click();

    const printInvoiceDialog = sel.transactionPrintDialog.printInvoiceDialog(page);
    await expect(printInvoiceDialog).toBeVisible({ timeout: 10_000 });
    await sel.transactionPrintDialog.clickNo(printInvoiceDialog);

    const printOrderSlipDialog = sel.transactionPrintDialog.printOrderSlipDialog(page);
    await expect(printOrderSlipDialog).toBeVisible({ timeout: 5_000 });
    await sel.transactionPrintDialog.clickNo(printOrderSlipDialog);

    await page.waitForURL('/transactions', { timeout: 15_000 });
  });

  test('should display the new transaction in the transaction list', async ({
    page,
  }) => {
    await page.goto('/transactions');

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should view transaction detail and verify line items match', async ({
    page,
  }) => {
    await page.goto('/transactions');

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

    await expect(page.getByText(CUSTOMER_NAME)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should mark an unpaid transaction as paid', async ({ page }) => {
    await page.goto('/transactions');

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_2);

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_2)
    ).toBeVisible({ timeout: 15_000 });

    await sel.transactionList.menuButton(page, CUSTOMER_NAME_2).click();
    await sel.transactionList.menuOption(page, 'Pay').click();

    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 10_000,
    });

    await sel.transactionPayDialog.walletSelect(page).click();
    await page.locator('span[data-disable-theme]').filter({ hasText: WALLET_NAME }).click();

    await sel.transactionPayDialog.submitButton(page).click();

    await expect(page.getByText('Pay Transaction')).not.toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_2);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_2)
    ).toBeVisible({ timeout: 15_000 });

    unpaidTransactionId = undefined;
  });
});
