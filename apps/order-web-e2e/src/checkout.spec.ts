/**
 * Phase 13: QRIS Checkout Happy Path
 *
 * Cart -> checkout summary -> name prompt -> QR displayed -> guest pays ->
 * success -> order status screen — the full loop
 * docs/prd-order-checkout-qris-doku.md closes, run against a stubbed
 * gateway (apps/api/cmd/dokustub) rather than the real DOKU sandbox.
 *
 * "Paying" is simulated by calling the stub's admin-only `/_stub/pay`
 * endpoint (utils/dokuStub.ts) with the `partnerReferenceNo` captured off
 * the browser's own `POST /carts/current/checkout` response — the stub then
 * pushes a correctly signed DOKU notification at the real API, exactly as
 * DOKU's webhook would, so this exercises the real
 * `VerifyDokuSignature` -> `ConfirmPayment` path end to end, not a shortcut
 * around it.
 *
 * Separate spec file from table-ordering.spec.ts so this suite's own
 * session cookie and seeded catalog/table/wallet don't interact with that
 * file's cart.
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';
import { markPaid } from './utils/dokuStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E Checkout Kategori ${TS}`;
const PRODUCT_NAME = `E2E Checkout Kopi ${TS}`;
const TABLE_LABEL = `E2E Checkout Meja ${TS}`;
const CUSTOMER_NAME = `E2E Tamu ${TS}`;
const PRICE = 22000;

test.describe.serial('QRIS Checkout', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let table: api.Table;
  let wallet: api.Wallet;

  test.beforeAll(async () => {
    category = await api.createCategory({ name: CATEGORY_NAME, station: 'NONE' });
    product = await api.createProduct({
      categoryId: category.id,
      name: PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: 'Reguler' }] }],
    });
    variant = await api.createVariant({
      productId: product.id,
      name: 'Reguler',
      price: PRICE,
      materials: [],
      values: [{ optionValueId: product.options[0].values[0].id }],
    });
    table = await api.createTable({ label: TABLE_LABEL });
    // D15: ORDER_PAYMENT_WALLET_ID (set for the API process under test,
    // see .github/workflows/e2e-main.yml) must point at an existing,
    // non-deleted, is_payment_target wallet — that wallet is seeded
    // directly via SQL before the API starts, keyed to a fixed id, so this
    // spec only needs to read it back for the balance assertion below.
    wallet = await api.getWallet(Number(process.env['ORDER_PAYMENT_WALLET_ID']));
  });

  test.afterAll(async () => {
    const cleanup = [
      () => api.deleteVariant(variant.id),
      () => api.deleteProduct(product.id),
      () => api.deleteCategory(category.id),
      () => api.deleteTable(table.id),
    ];
    for (const step of cleanup) {
      await step().catch(() => {
        // Ignore — the row may not exist if an earlier step failed.
      });
    }
  });

  test('a guest builds a cart, pays with QRIS and lands on the prepared-order screen', async ({
    page,
  }) => {
    const balanceBeforePayment = wallet.balance;

    // 1. Menu -> item -> cart (FR-6/FR-7 in docs/prd-table-ordering.md).
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    // 2. Checkout summary (UX step 2).
    await sel.cartScreen.checkoutButton(page).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/checkout$`));
    await expect(sel.checkout.summaryTitle(page)).toBeVisible();
    const payButton = sel.checkout.payButton(page, formatRupiah(PRICE));
    await expect(payButton).toBeVisible();

    // 3. Name prompt — no QR yet (D17/UX step 3).
    await payButton.click();
    await expect(sel.checkout.nameInput(page)).toBeVisible();
    await sel.checkout.nameInput(page).fill(CUSTOMER_NAME);

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.checkout.submitNameButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    const partnerReferenceNo: string = payment.partnerReferenceNo;
    expect(partnerReferenceNo).toBeTruthy();

    // 4. QR displayed, polling starts (UX step 4).
    await expect(sel.checkout.saveQrButton(page)).toBeVisible();
    await expect(sel.checkout.waitingForPaymentText(page)).toBeVisible();

    // "Pay" via the stubbed gateway — pushes a signature-verified DOKU
    // notification at the real API (D13/D14), the primary confirmation
    // path (D12).
    await markPaid(partnerReferenceNo);

    // 5. Success, then the ~2s delayed redirect (UX step 5).
    await expect(sel.checkout.paymentSuccessTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/t/${table.code}/status\\?ref=${partnerReferenceNo}$`),
      { timeout: 5_000 }
    );

    // 6. Order status screen — table + name, terminal (UX step 6).
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible();
    await expect(sel.orderStatus.tableLabel(page, TABLE_LABEL)).toBeVisible();
    await expect(sel.orderStatus.customerName(page, CUSTOMER_NAME)).toBeVisible();

    // A reload re-seeds from the same reference via getServerSideProps
    // (D18) rather than depending on client state.
    await page.reload();
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.orderStatus.tableLabel(page, TABLE_LABEL)).toBeVisible();

    // The transaction is paid on the POS side of the same event (D4/D15) —
    // the QRIS wallet balance moved by the paid amount.
    const walletAfterPayment = await api.getWallet(wallet.id);
    expect(walletAfterPayment.balance).toBeGreaterThan(balanceBeforePayment);
  });
});
