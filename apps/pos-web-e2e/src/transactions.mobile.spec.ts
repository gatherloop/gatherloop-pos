/**
 * Phase 7 (docs/prd-transaction-form-mobile.md): Mobile E2E coverage for the
 * compact transaction form.
 *
 * Runs only under the `mobile-chromium` project (phone viewport —
 * `devices['Pixel 5']`, see playwright.config.ts) and covers the compact
 * happy path end to end: open Create → pick a product → pick a variant +
 * amount → the floating cart button shows the item count → open the cart
 * sheet → fill customer name + order number → Submit → pay.
 *
 * The desktop suite (`transactions.spec.ts`) is untouched and keeps running
 * under `chromium` — see PRD FR-8 / Phase 7 acceptance criteria.
 *
 * Test data is isolated from the desktop suite (distinct name/prefix) so
 * both specs can share the same database despite `workers: 1` serial
 * execution.
 */

import { test, expect, type Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// ---------------------------------------------------------------------------
// Constants — unique per test run to avoid collisions with the desktop spec
// ---------------------------------------------------------------------------

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

    // Two option values forces the variant/amount dialog to open instead of
    // adding the item directly — same reasoning as the desktop spec.
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

    // Cashless wallet — no "Paid Amount" entry required during payment.
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

    // Compact layout lands directly on the full-screen product picker — the
    // search input is the first thing visible, no cart card next to it.
    await expect(sel.transactionForm.productSearchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    // No cart button yet — the cart is empty on a fresh Create.
    await expect(sel.transactionCartButton.button(page)).not.toBeVisible();

    // Search and select the product.
    await sel.transactionForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const productCard = sel.transactionForm.productCard(page, PRODUCT_NAME);
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    // The variant/amount dialog opens, resized for the viewport (Phase 5) —
    // detect it via the Cancel button, same as the desktop spec.
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit' }).last().click();
    await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

    // The floating cart button appears once the item lands, showing the
    // count and the final total — the product list stays usable underneath.
    const cartButton = sel.transactionCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(/^1 item ·/);
    await expect(productCard).toBeVisible();

    // Opening the cart reveals the sheet — Customer Name, Order Number and
    // the item just added, plus a pinned Total + Submit footer.
    await cartButton.click();
    await expect(sel.transactionCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });

    await sel.transactionForm.customerNameInput(page).fill(CUSTOMER_NAME);
    await sel.transactionForm.orderNumberInput(page).fill('1');

    // Submit — only one Submit button exists while the sheet is open (the
    // sheet unmounts its content when closed).
    await sel.transactionForm.submitButton(page).click();

    // Pay dialog appears — the cart sheet must have closed first (FR-7) so
    // the alert is never stacked behind/over it.
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

    // Verify the transaction landed correctly, and capture its ID for cleanup.
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
