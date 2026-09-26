import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CATEGORY_NAME = `E2E Cod Kategori ${TS}`;
const PRODUCT_NAME = `E2E Cod Product ${TS}`;
const TABLE_LABEL = `E2E Cod Meja ${TS}`;
const WALLET_NAME = `E2E Cod Wallet ${TS}`;
const CUSTOMER_NAME_APPROVE = `E2E Cod Approve Guest ${TS}`;
const CUSTOMER_NAME_REJECT = `E2E Cod Reject Guest ${TS}`;
const PRICE = 22_000;

// A minimal valid JPEG (1x1 px) — real bytes, not a client-asserted content
// type, since ValidateVerificationPhoto sniffs them (docs/prd-order-cod-payment.md FR-2/D13).
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

test.describe.serial('POS COD Verification', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let table: api.Table;
  let wallet: api.Wallet;

  test.beforeAll(async ({ request }) => {
    category = await api.createCategory(request, { name: CATEGORY_NAME });
    product = await api.createProduct(request, {
      categoryId: category.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });

    const optionValueId = product.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    variant = await api.createVariant(request, {
      productId: product.id,
      name: 'Standard',
      price: PRICE,
      materials: [],
      values: [{ optionValueId }],
    });

    table = await api.createTable(request, { label: TABLE_LABEL });

    wallet = await api.createWallet(request, {
      name: WALLET_NAME,
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: true,
    });
  });

  test.afterAll(async ({ request }) => {
    // The approved order below ends up paid, and DeleteTransactionById
    // rejects paid transactions (same reasoning as transactions.fulfillment.spec.ts);
    // the rejected one is soft-deleted already. Both are left behind in the
    // throwaway per-run CI database rather than deleted here.
    await api.deleteVariant(request, variant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, product.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, category.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteTable(request, table.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteWallet(request, wallet.id).catch(() => {
      // Ignore — may already be gone
    });
  });

  test('a barista verifies, approves, marks ready and pays a COD order', async ({
    page,
    request,
  }) => {
    await api.checkoutOrderTransaction(request, {
      tableCode: table.code,
      variantId: variant.id,
      amount: 1,
      customerName: CUSTOMER_NAME_APPROVE,
      method: 'cod',
      verificationPhoto: TINY_JPEG_BASE64,
    });

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_APPROVE);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_APPROVE)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sel.transactionList.needsConfirmationBadge(page, CUSTOMER_NAME_APPROVE)
    ).toBeVisible();

    await sel.transactionList.menuButton(page, CUSTOMER_NAME_APPROVE).click();
    // Pay, Mark as Ready and Delete are hidden while awaiting confirmation (FR-12).
    await expect(
      sel.transactionList.menuOption(page, 'Pay')
    ).toHaveCount(0);
    await sel.transactionList.menuOption(page, 'Verify').click();

    await expect(sel.transactionVerificationSheet.approveButton(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(sel.transactionVerificationSheet.rejectButton(page)).toBeVisible();

    await sel.transactionVerificationSheet.approveButton(page).click();

    await expect(
      sel.transactionList.needsConfirmationBadge(page, CUSTOMER_NAME_APPROVE)
    ).toBeHidden({ timeout: 10_000 });
    await expect(
      sel.transactionList.fulfillmentBadge(page, CUSTOMER_NAME_APPROVE, 'Preparing')
    ).toBeVisible();
    await expect(
      sel.transactionList.codUnpaidBadge(page, CUSTOMER_NAME_APPROVE)
    ).toBeVisible();

    await sel.transactionList.menuButton(page, CUSTOMER_NAME_APPROVE).click();
    await sel.transactionList.menuOption(page, 'Mark as Ready').click();
    await sel.common.confirmButton(page).click();

    await expect(
      sel.transactionList.fulfillmentBadge(page, CUSTOMER_NAME_APPROVE, 'Ready')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      sel.transactionList.codUnpaidBadge(page, CUSTOMER_NAME_APPROVE)
    ).toBeVisible();

    await sel.transactionList.menuButton(page, CUSTOMER_NAME_APPROVE).click();
    await sel.transactionList.menuOption(page, 'Pay').click();

    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 10_000,
    });
    await sel.transactionPayDialog.walletSelect(page).click();
    await page
      .locator('span[data-disable-theme]')
      .filter({ hasText: WALLET_NAME })
      .click();
    await sel.transactionPayDialog.submitButton(page).click();

    await expect(page.getByText('Pay Transaction')).toBeHidden({
      timeout: 15_000,
    });

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_APPROVE);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_APPROVE)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sel.transactionList.codUnpaidBadge(page, CUSTOMER_NAME_APPROVE)
    ).toBeHidden();
  });

  test('a barista verifies and rejects a COD order, and its row disappears', async ({
    page,
    request,
  }) => {
    await api.checkoutOrderTransaction(request, {
      tableCode: table.code,
      variantId: variant.id,
      amount: 1,
      customerName: CUSTOMER_NAME_REJECT,
      method: 'cod',
      verificationPhoto: TINY_JPEG_BASE64,
    });

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_REJECT);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_REJECT)
    ).toBeVisible({ timeout: 15_000 });

    await sel.transactionList.menuButton(page, CUSTOMER_NAME_REJECT).click();
    await sel.transactionList.menuOption(page, 'Verify').click();

    await expect(sel.transactionVerificationSheet.rejectButton(page)).toBeVisible({
      timeout: 10_000,
    });
    await sel.transactionVerificationSheet.rejectButton(page).click();

    await expect(page.getByText(/^Reject order #\d+\?/)).toBeVisible();
    await sel.transactionVerificationSheet.rejectButton(page).click();

    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_REJECT);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_REJECT)
    ).toBeHidden({ timeout: 10_000 });
  });
});
