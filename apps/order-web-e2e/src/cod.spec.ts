import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';

const TS = Date.now();
const CATEGORY_NAME = `E2E Cod Kategori ${TS}`;
const PRODUCT_NAME = `E2E Cod Kopi ${TS}`;
const TABLE_LABEL = `E2E Cod Meja ${TS}`;
const CUSTOMER_NAME = `E2E Cod Tamu ${TS}`;
const PRICE = 32000;

test.describe.serial('Cash on Delivery (COD) Checkout', () => {
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
    // The order transaction created below is left unpaid and awaiting
    // pickup after approval — same as the other checkout specs, it is left
    // behind in the throwaway per-run CI database rather than deleted here.
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

  test('a guest builds a cart, checks out with COD and a camera photo, and the order walks awaiting → preparing → ready once the barista approves', async ({
    page,
  }) => {
    // getUserMedia against Chromium's fake device (playwright.config.ts) —
    // granting the permission too means the flow works even if the
    // --use-fake-ui-for-media-stream launch flag stops auto-accepting it.
    await page.context().grantPermissions(['camera']);

    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();

    await expect(sel.cartScreen.nameInput(page)).toBeVisible();
    await sel.cartScreen.fillCustomerDetails(page, CUSTOMER_NAME);
    await sel.cartScreen.codMethodButton(page).click();

    // Camera capture (FR-7): requesting → live → shutter → preview → accept.
    await expect(sel.cartScreen.codPhotoMissingButton(page)).toBeDisabled();
    await expect(sel.cameraCapture.shutterButton(page)).toBeEnabled({
      timeout: 10_000,
    });
    await sel.cameraCapture.shutterButton(page).click();
    await sel.cameraCapture.useThisPhotoButton(page).click();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitCodButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    const { data: payment } = await checkoutResponse.json();
    expect(payment.method).toBe('cod');
    const partnerReferenceNo: string = payment.partnerReferenceNo;
    expect(partnerReferenceNo).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/orders/${partnerReferenceNo}$`), {
      timeout: 5_000,
    });
    await expect(sel.orderStatus.codVerificationHeading(page)).toBeVisible();
    await expect(
      sel.orderStatus.transactionNumberBadge(page, payment.transactionNumber)
    ).toBeVisible();

    // The barista's POS action, stood in for by a direct API call — the
    // guest's own session cannot call this staff-only route (D14).
    const [transaction] = await api.findTransactionsByQuery(CUSTOMER_NAME);
    expect(transaction).toBeTruthy();
    await api.approveTransactionVerification(transaction.id);

    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      sel.orderStatus.payAtPickupBanner(page, formatRupiah(PRICE))
    ).toBeVisible();

    await api.completeTransaction(transaction.id);

    await expect(sel.orderStatus.readyTitle(page)).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      sel.orderStatus.payAtPickupBanner(page, formatRupiah(PRICE))
    ).toBeVisible();
  });
});
