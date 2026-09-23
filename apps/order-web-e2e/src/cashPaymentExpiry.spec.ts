import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';

const TS = Date.now();
const CATEGORY_NAME = `E2E Cash Expiry Kategori ${TS}`;
const PRODUCT_NAME = `E2E Cash Expiry Kopi ${TS}`;
const TABLE_LABEL = `E2E Cash Expiry Meja ${TS}`;
const CUSTOMER_NAME = `E2E Cash Expiry Tamu ${TS}`;
const PRICE = 17000;

test.describe.serial('Cash Payment Expiry', () => {
  let category: api.Category;
  let product: api.Product;
  let variant: api.Variant;
  let table: api.Table;

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

  test('an abandoned cash order expires on its own, drops off the POS list and frees the cart', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.nameInput(page).fill(CUSTOMER_NAME);
    await sel.cartScreen.cashMethodButton(page).click();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitCashButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    const partnerReferenceNo: string = payment.partnerReferenceNo;
    expect(partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(
      new RegExp(`/orders/${partnerReferenceNo}$`),
      { timeout: 5_000 }
    );
    await expect(sel.orderStatus.waitingForCashPaymentText(page)).toBeVisible();

    // Nobody pays. A server-side sweeper — not this page's own countdown —
    // is what expires the payment (docs/prd-order-cash-payment.md FR-4).
    await expect(sel.orderStatus.expiredTitle(page)).toBeVisible({
      timeout: 45_000,
    });
    await expect(sel.orderStatus.cashExpiredSubtitle(page)).toBeVisible();

    const remaining = await api.findTransactionsByQuery(CUSTOMER_NAME);
    expect(remaining).toHaveLength(0);

    await sel.orderStatus.backToCartButton(page).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
  });
});
