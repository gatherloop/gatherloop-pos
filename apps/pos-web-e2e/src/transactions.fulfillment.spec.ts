import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { markPaid } from './utils/dokuStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E Fulfil Kategori ${TS}`;
const PRODUCT_NAME = `E2E Fulfil Product ${TS}`;
const TABLE_LABEL = `E2E Fulfil Meja ${TS}`;
const CUSTOMER_NAME = `E2E Fulfil Guest ${TS}`;
const PRICE = 18_000;

test.describe.serial('POS Order Fulfilment', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;
  let testTable: api.Table;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });

    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: PRICE,
      materials: [],
      values: [{ optionValueId }],
    });

    testTable = await api.createTable(request, { label: TABLE_LABEL });

    const payment = await api.checkoutOrderTransaction(request, {
      tableCode: testTable.code,
      variantId: testVariant.id,
      amount: 1,
      customerName: CUSTOMER_NAME,
    });
    await markPaid(payment.partnerReferenceNo);
  });

  test.afterAll(async ({ request }) => {
    // The order transaction created in beforeAll is paid, and
    // DeleteTransactionById rejects paid transactions, so — same as
    // order-web-e2e's checkout.spec.ts — it is left behind in the
    // throwaway per-run CI database rather than deleted here.
    await api.deleteVariant(request, testVariant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, testProduct.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, testCategory.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteTable(request, testTable.id).catch(() => {
      // Ignore — may already be gone
    });
  });

  test('filters to Preparing, opens the order, marks it ready, and the badge flips', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);

    await sel.transactionList.filterButton(page).click();
    await sel.transactionList.fulfillmentFilterOption(page, 'Preparing').click();

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sel.transactionList.fulfillmentBadge(page, CUSTOMER_NAME, 'Preparing')
    ).toBeVisible();

    await sel.transactionList.transactionItem(page, CUSTOMER_NAME).click();
    await page.waitForURL(/\/transactions\/\d+\/detail$/, { timeout: 15_000 });

    await expect(sel.transactionDetail.fulfilmentStatus(page)).toHaveText(
      'Preparing'
    );

    await sel.transactionDetail.markReadyButton(page).click();
    await sel.common.confirmButton(page).click();

    await expect(sel.transactionDetail.fulfilmentStatus(page)).toHaveText(
      'Ready',
      { timeout: 10_000 }
    );
    await expect(sel.transactionDetail.markPreparingButton(page)).toBeVisible();

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);
    await sel.transactionList.filterButton(page).click();
    await sel.transactionList.fulfillmentFilterOption(page, 'Ready').click();

    await expect(
      sel.transactionList.fulfillmentBadge(page, CUSTOMER_NAME, 'Ready')
    ).toBeVisible({ timeout: 15_000 });
  });
});
