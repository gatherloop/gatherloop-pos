import { test, expect, Page } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';
import { markPaid } from './utils/dokuStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E History Kategori ${TS}`;
const PRODUCT_NAME = `E2E History Kopi ${TS}`;
const TABLE_LABEL = `E2E History Meja ${TS}`;
const CUSTOMER_NAME = `E2E History Tamu ${TS}`;
const PRICE = 18000;

test.describe.serial('Order History', () => {
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
    // Both orders below are paid, and DeleteTransactionById rejects paid
    // transactions — same as checkout.spec.ts, left behind in the throwaway
    // per-run CI database rather than deleted here.
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

  const checkout = async (page: Page) => {
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
    expect(payment.partnerReferenceNo).toBeTruthy();
    return payment as {
      partnerReferenceNo: string;
      transactionNumber: number;
    };
  };

  test('a guest orders twice, leaves without a dialog in between, and sees both orders in history', async ({
    page,
  }) => {
    let dialogAppeared = false;
    page.on('dialog', (dialog) => {
      dialogAppeared = true;
      void dialog.dismiss();
    });

    await page.goto(`t/${table.code}`);

    const orderA = await checkout(page);
    await markPaid(orderA.partnerReferenceNo);
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      sel.orderStatus.transactionNumberBadge(page, orderA.transactionNumber)
    ).toBeVisible();

    await sel.orderStatus.orderAgainButton(page).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}$`));
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();

    const orderB = await checkout(page);
    await markPaid(orderB.partnerReferenceNo);
    await expect(sel.orderStatus.preparingTitle(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      sel.orderStatus.transactionNumberBadge(page, orderB.transactionNumber)
    ).toBeVisible();

    expect(dialogAppeared).toBe(false);

    await sel.orderBrandHeader.historyButton(page).click();
    await expect(page).toHaveURL(/\/orders$/);

    const rowA = sel.orderHistory.row(page, orderA.transactionNumber);
    const rowB = sel.orderHistory.row(page, orderB.transactionNumber);
    await expect(rowA).toBeVisible();
    await expect(rowB).toBeVisible();

    const rowBoundingBoxA = await rowA.boundingBox();
    const rowBoundingBoxB = await rowB.boundingBox();
    expect(rowBoundingBoxB?.y).toBeLessThan(rowBoundingBoxA?.y ?? Infinity);

    await rowB.click();
    await expect(page).toHaveURL(
      new RegExp(`/orders/${orderB.partnerReferenceNo}$`)
    );
    await expect(
      sel.orderStatus.transactionNumberBadge(page, orderB.transactionNumber)
    ).toBeVisible();
    await expect(sel.orderStatus.itemLine(page, 1, PRODUCT_NAME)).toBeVisible();
  });
});
