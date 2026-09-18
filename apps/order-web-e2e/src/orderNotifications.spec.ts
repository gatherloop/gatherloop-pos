import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';
import { markPaid } from './utils/dokuStub';
import { countWebPushSubscriptionsForSession } from './utils/db';

const TS = Date.now();
const CATEGORY_NAME = `E2E Notif Kategori ${TS}`;
const PRODUCT_NAME = `E2E Notif Kopi ${TS}`;
const TABLE_LABEL = `E2E Notif Meja ${TS}`;
const CUSTOMER_NAME = `E2E Notif Tamu ${TS}`;
const PRICE = 20000;

test.describe.serial('Guest Order Notifications', () => {
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
    // The order transaction created below is paid, and DeleteTransactionById
    // rejects paid transactions — same as checkout.spec.ts, it is left behind
    // in the throwaway per-run CI database rather than deleted here.
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

  test('a guest can opt into push notifications from the preparing screen, and the subscription is stored for their session', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['notifications']);

    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
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

    await markPaid(partnerReferenceNo);

    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });

    await expect(sel.orderNotificationOptIn.subscribeButton(page)).toBeVisible();

    const subscribeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/web-push/subscriptions') &&
        response.request().method() === 'POST'
    );
    await sel.orderNotificationOptIn.subscribeButton(page).click();
    const subscribeResponse = await subscribeResponsePromise;
    expect(subscribeResponse.ok()).toBeTruthy();

    await expect(sel.orderNotificationOptIn.subscribedText(page)).toBeVisible({
      timeout: 15_000,
    });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === 'gl_session_id');
    expect(sessionCookie).toBeTruthy();

    const subscriptionCount = await countWebPushSubscriptionsForSession(
      sessionCookie?.value ?? ''
    );
    expect(subscriptionCount).toBeGreaterThanOrEqual(1);
  });
});
