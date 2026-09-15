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

  test('a guest builds a cart, pays with QRIS and lands on the prepared-order screen, in one navigation', async ({
    page,
  }) => {
    const balanceBeforePayment = wallet.balance;

    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    const payButton = sel.cartScreen.checkoutButton(page, formatRupiah(PRICE));
    await expect(payButton).toBeVisible();
    await payButton.click();

    await expect(sel.cartScreen.nameInput(page)).toBeVisible();
    await sel.cartScreen.nameInput(page).fill(CUSTOMER_NAME);

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    const partnerReferenceNo: string = payment.partnerReferenceNo;
    expect(partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(
      new RegExp(`/t/${table.code}/status\\?ref=${partnerReferenceNo}$`),
      { timeout: 5_000 }
    );
    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
    await expect(sel.orderStatus.waitingForPaymentText(page)).toBeVisible();

    await markPaid(partnerReferenceNo);

    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/t/${table.code}/status\\?ref=${partnerReferenceNo}$`)
    );

    await expect(sel.orderStatus.tableLabel(page, TABLE_LABEL)).toBeVisible();
    await expect(
      sel.orderStatus.transactionNumberBadge(page, payment.transactionNumber)
    ).toBeVisible();

    await page.reload();
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.orderStatus.tableLabel(page, TABLE_LABEL)).toBeVisible();

    const walletAfterPayment = await api.getWallet(wallet.id);
    expect(walletAfterPayment.balance).toBeGreaterThan(balanceBeforePayment);
  });

  test('reloading while the QR is on screen keeps showing the QR', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.nameInput(page).fill(CUSTOMER_NAME);
    await sel.cartScreen.submitNameButton(page).click();

    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
    await expect(sel.orderStatus.waitingForPaymentText(page)).toBeVisible();
    const statusUrl = page.url();

    await page.reload();

    await expect(page).toHaveURL(statusUrl);
    await expect(sel.orderStatus.saveQrButton(page)).toBeVisible();
    await expect(sel.orderStatus.waitingForPaymentText(page)).toBeVisible();
  });

  test('the retired /checkout route redirects to the cart', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}/checkout`);
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
  });
});
