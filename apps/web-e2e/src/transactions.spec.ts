/**
 * Phase 5: Transaction Flow (Core POS)
 *
 * Verifies the primary business flow — creating a sale transaction and
 * processing payment. Tests run serially — each builds on the shared
 * prerequisite data created in beforeAll.
 *
 * Prerequisite data (created via API in beforeAll):
 * - Category → Product (with one option/value) → Variant (with price)
 * - Wallet (cashless — no paidAmount entry needed)
 * - Coupon (fixed discount)
 * - A second unpaid transaction (for test 7 "mark as paid" scenario)
 *
 * Flows tested:
 * 1. Select products & quantities in the transaction form
 * 2. Verify correct subtotal and total display
 * 3. Apply a coupon and verify the discounted total
 * 4. Submit form and complete payment with the selected wallet
 * 5. Verify the paid transaction appears in the transaction list
 * 6. Navigate to transaction detail and verify line items
 * 7. Mark a separate unpaid transaction as paid
 *
 * Why this is the most important E2E test:
 * - Spans multiple entities: products, coupons, wallets, transactions
 * - Involves financial calculations that must be correct end-to-end
 * - Core business flow — what the POS system exists for
 * - Authentication is handled via storageState from global-setup.ts
 */

import { test, expect, type Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// ---------------------------------------------------------------------------
// Constants — unique per test run to avoid collisions
// ---------------------------------------------------------------------------

const TS = Date.now();
const CUSTOMER_NAME = `E2E Customer ${TS}`;
const CUSTOMER_NAME_2 = `E2E CustomerB ${TS}`;
const PRODUCT_NAME = `E2E TxProduct ${TS}`;
const CATEGORY_NAME = `E2E TxCategory ${TS}`;
const COUPON_CODE = `E2ETXC${TS}`.slice(0, 20); // coupon code max length guard
const WALLET_NAME = `E2E TxWallet ${TS}`;

const PRODUCT_PRICE = 50_000;
const COUPON_DISCOUNT = 10_000;
const DISCOUNTED_TOTAL = PRODUCT_PRICE - COUPON_DISCOUNT; // 40_000

/** Indonesian locale currency format: 50000 → "Rp. 50.000" */
function formatRupiah(amount: number): string {
  return `Rp. ${amount.toLocaleString('id')}`;
}

// ---------------------------------------------------------------------------
// Shared helper — opens /transactions/create and adds the test product
// ---------------------------------------------------------------------------

async function openFormAndAddProduct(page: Page, productName: string) {
  await page.goto('/transactions/create');

  // Confirm the form is ready (waits for SSR + client hydration + data fetches)
  await expect(sel.transactionForm.submitButton(page)).toBeVisible({
    timeout: 15_000,
  });

  await sel.transactionForm.customerNameInput(page).fill(CUSTOMER_NAME);

  // Use the search input to filter products so the target card is always
  // visible regardless of SSR ordering or client-side re-fetch timing.
  // After fill, the state machine debounces for 600ms then fetches from the
  // API (CHANGE_PARAMS → loading → loaded).  We MUST wait for the API
  // response before clicking because SELECT_PRODUCT is only handled in the
  // 'loaded' state — clicking during 'changingParams' is silently ignored.
  await sel.transactionForm.productSearchInput(page).fill(productName);
  await page.waitForResponse(
    (resp) =>
      resp.url().includes('/api/products') && resp.status() === 200,
    { timeout: 15_000 }
  );

  const productCard = sel.transactionForm.productCard(page, productName);
  await expect(productCard).toBeVisible({ timeout: 10_000 });
  await productCard.click();

  // Wait for the option-selection dialog to open.
  // Tamagui Dialog.Content does NOT add role="dialog" to the DOM.
  // Instead, we detect the dialog by the Cancel button it renders.
  const cancelButton = page.getByRole('button', { name: 'Cancel' });
  await expect(cancelButton).toBeVisible({ timeout: 10_000 });

  // Submit the dialog to add the item — use .last() to pick the Submit
  // inside the dialog in case there are multiple Submit buttons on the page.
  await page.getByRole('button', { name: 'Submit' }).last().click();

  // Dialog closes after submitting
  await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

  // Wait for the item to actually appear in the Items panel (right side).
  // Adding an item is async: after dialog closes, the state machine fetches
  // the variant from the API before calling onAddItem. Without this wait,
  // the form may submit with an empty transactionItems array.
  await expect(
    page.locator('p').filter({ hasText: productName }).first()
  ).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe.serial('Transaction Flow', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;
  let testWallet: api.Wallet;
  let testCoupon: api.Coupon;

  // IDs of transactions created during the suite — for cleanup
  let createdTransactionId: number | undefined;
  let unpaidTransactionId: number | undefined;

  // ── Setup ──────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ request }) => {
    // 1. Category
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });

    // 2. Product (with one option + TWO values so the dialog always appears)
    // When a product has exactly 1 option with 1 value the state machine skips
    // the dialog and adds the item directly. Two values forces the dialog open.
    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [{ name: 'Size', values: [{ name: 'Standard' }, { name: 'Large' }] }],
    });

    // The first option value ID is needed to create a variant
    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    // 3. Variant (gives the product a price)
    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: PRODUCT_PRICE,
      materials: [],
      values: [{ optionValueId }],
    });

    // 4. Wallet (cashless — no "Paid Amount" entry required during payment)
    testWallet = await api.createWallet(request, {
      name: WALLET_NAME,
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: true,
    });

    // 5. Coupon (fixed discount)
    testCoupon = await api.createCoupon(request, {
      code: COUPON_CODE,
      type: 'fixed',
      amount: COUPON_DISCOUNT,
    });

    // 6. A second unpaid transaction — used in test 7 "mark as paid"
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

  // ── Teardown ───────────────────────────────────────────────────────────────

  test.afterAll(async ({ request }) => {
    // Transactions must be deleted first (they reference wallet, variant, coupon)
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

  // ── Test 1: Select products & quantities ───────────────────────────────────

  test('should create a transaction by selecting products and quantities', async ({
    page,
  }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    // The product name should appear in the items section (right panel).
    // In the items panel, product names render as <Paragraph> (i.e. <p>),
    // distinct from the product list left panel which uses <H4>.
    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Test 2: Subtotal and total display ────────────────────────────────────

  test('should display correct subtotal and total calculations', async ({
    page,
  }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    // The product price is displayed as the total. Both the per-item price (p)
    // and the subtotal (h4) show the same value — use .first() to match either.
    await expect(
      page.getByText(formatRupiah(PRODUCT_PRICE)).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Test 3: Apply coupon and verify discounted total ──────────────────────

  test('should apply a coupon and verify discounted total', async ({ page }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    // Verify the pre-coupon total
    await expect(
      page.getByText(formatRupiah(PRODUCT_PRICE)).first()
    ).toBeVisible({ timeout: 10_000 });

    // Open the coupon sheet
    await sel.transactionForm.addCouponButton(page).click();

    // Wait for the coupon to appear in the sheet
    await expect(page.getByText(COUPON_CODE)).toBeVisible({ timeout: 10_000 });

    // Select the coupon
    await page.getByText(COUPON_CODE).click();

    // The discounted total should now be visible
    await expect(
      page.getByText(formatRupiah(DISCOUNTED_TOTAL)).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Test 4: Submit form and complete payment ──────────────────────────────
  //
  // The create-transaction flow works differently from a plain form submit:
  // 1. Clicking Submit creates the transaction via API.
  // 2. A Pay dialog immediately appears on the create page (not a redirect).
  // 3. After selecting a wallet and paying, print-invoice/order-slip dialogs appear.
  // 4. Dismissing them navigates to /transactions.

  test('should complete payment with selected wallet', async ({ page }) => {
    await openFormAndAddProduct(page, PRODUCT_NAME);

    // Submit the transaction form — the app creates the transaction and then
    // immediately opens a Pay alertdialog on the same page.
    await sel.transactionForm.submitButton(page).click();

    // Pay dialog appears
    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 15_000,
    });

    // Select the test wallet
    await sel.transactionPayDialog.walletSelect(page).click();
    await page.locator('span').getByText(WALLET_NAME, { exact: true }).click();

    // Submit the payment
    await sel.transactionPayDialog.submitButton(page).click();

    // After payment two print-confirmation dialogs appear sequentially.
    // Note: AlertDialog.Title does NOT render with getByRole('heading') findable,
    // and the "No" button's accessible name may differ from its text — use the
    // dialog container (filtered by text) and click the first button with force.
    // force: true bypasses the pointer-event block from the Pay Transaction overlay.
    const printInvoiceDialog = sel.transactionPrintDialog.printInvoiceDialog(page);
    await expect(printInvoiceDialog).toBeVisible({ timeout: 10_000 });
    await sel.transactionPrintDialog.clickNo(printInvoiceDialog);

    const printOrderSlipDialog = sel.transactionPrintDialog.printOrderSlipDialog(page);
    await expect(printOrderSlipDialog).toBeVisible({ timeout: 5_000 });
    await sel.transactionPrintDialog.clickNo(printOrderSlipDialog);

    // Navigation to /transactions follows dismissal of the last print dialog
    await page.waitForURL('/transactions', { timeout: 15_000 });
  });

  // ── Test 5: Verify transaction in list ────────────────────────────────────

  test('should display the new transaction in the transaction list', async ({
    page,
  }) => {
    await page.goto('/transactions');

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 6: View transaction detail ──────────────────────────────────────

  test('should view transaction detail and verify line items match', async ({
    page,
  }) => {
    await page.goto('/transactions');

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME);

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Clicking a paid transaction navigates to its detail page
    await sel.transactionList.transactionItem(page, CUSTOMER_NAME).click();
    await page.waitForURL(/\/transactions\/\d+\/detail$/, { timeout: 15_000 });

    // Capture the transaction ID from the URL for cleanup
    const match = page.url().match(/\/transactions\/(\d+)\/detail$/);
    if (match) {
      createdTransactionId = parseInt(match[1]);
    }

    // Customer name and product should both appear on the detail page
    await expect(page.getByText(CUSTOMER_NAME)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── Test 7: Mark an unpaid transaction as paid ────────────────────────────

  test('should mark an unpaid transaction as paid', async ({ page }) => {
    await page.goto('/transactions');

    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_2);

    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_2)
    ).toBeVisible({ timeout: 15_000 });

    // Open menu → click Pay
    await sel.transactionList.menuButton(page, CUSTOMER_NAME_2).click();
    await sel.transactionList.menuOption(page, 'Pay').click();

    // Pay dialog should appear
    await expect(page.getByText('Pay Transaction')).toBeVisible({
      timeout: 10_000,
    });

    // Select the test wallet
    await sel.transactionPayDialog.walletSelect(page).click();
    await page.locator('span').getByText(WALLET_NAME, { exact: true }).click();

    // Submit the payment
    await sel.transactionPayDialog.submitButton(page).click();

    // Dialog closes
    await expect(page.getByText('Pay Transaction')).not.toBeVisible({
      timeout: 15_000,
    });

    // The transaction is now paid — clicking it navigates to detail
    await page.goto('/transactions');
    await sel.transactionList.searchInput(page).fill(CUSTOMER_NAME_2);
    await expect(
      sel.transactionList.transactionItem(page, CUSTOMER_NAME_2)
    ).toBeVisible({ timeout: 15_000 });

    // Mark as cleaned up (payment makes it non-deletable via the delete API
    // but afterAll handles it gracefully)
    unpaidTransactionId = undefined;
  });
});
