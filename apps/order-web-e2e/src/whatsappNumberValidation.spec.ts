import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';
import {
  NOT_REGISTERED_WHATSAPP_NUMBER,
  getValidateCallCount,
} from './utils/fonnteStub';

const TS = Date.now();
const CATEGORY_NAME = `E2E WA Validation Kategori ${TS}`;
const PRODUCT_NAME = `E2E WA Validation Kopi ${TS}`;
const TABLE_LABEL = `E2E WA Validation Meja ${TS}`;
const CUSTOMER_NAME = `E2E WA Validation Tamu ${TS}`;
const PRICE = 19000;

// Ends in a non-"0000" digit so cmd/fonntestub always reports it registered
// (docs/prd-order-whatsapp-number-validation.md phase 8), and it is unique to
// this file's run so the second checkout below is a genuine cache hit, not a
// carry-over from another spec's number.
const REGISTERED_WHATSAPP_NUMBER = `0812${String(TS).slice(-7)}1`;
const NORMALIZED_REGISTERED_WHATSAPP_NUMBER =
  '62' + REGISTERED_WHATSAPP_NUMBER.slice(1);

test.describe.serial('Order-app WhatsApp number validation', () => {
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

  test('a number with no WhatsApp account shows the red field error and keeps the sheet open', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(
      page,
      CUSTOMER_NAME,
      NOT_REGISTERED_WHATSAPP_NUMBER
    );

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(page).click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.status()).toBe(400);

    await expect(
      sel.cartScreen.whatsappNumberNotRegisteredError(page)
    ).toBeVisible();
    // The sheet never closed — the guest's own input is still there, unchanged.
    await expect(sel.cartScreen.whatsappNumberInput(page)).toHaveValue(
      NOT_REGISTERED_WHATSAPP_NUMBER
    );
    await expect(sel.cartScreen.nameInput(page)).toBeVisible();
    await expect(page).not.toHaveURL(/\/orders\//);
  });

  test('a registered number checks out, and a second checkout with the same number makes no stub call', async ({
    page,
    browser,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(
      page,
      CUSTOMER_NAME,
      REGISTERED_WHATSAPP_NUMBER
    );

    const firstCheckoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(page).click();
    const firstCheckoutResponse = await firstCheckoutResponsePromise;
    expect(firstCheckoutResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/orders\//, { timeout: 5_000 });

    expect(
      await getValidateCallCount(NORMALIZED_REGISTERED_WHATSAPP_NUMBER)
    ).toBe(1);

    // A brand new browser context: a fresh session, with no cookie carrying
    // the number over, and a fresh cart on the same table — the cache below
    // is keyed by the number itself, not by who is asking (D2 of the PRD).
    const context = await browser.newContext();
    const secondPage = await context.newPage();

    await secondPage.goto(`t/${table.code}`);
    await sel.menuList.productCard(secondPage, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(secondPage, 'Reguler').click();
    await sel.itemDetail.addToCartButton(secondPage).click();
    await sel.cartBar.viewCartButton(secondPage).click();
    await expect(
      sel.cartScreen.lineItemName(secondPage, PRODUCT_NAME)
    ).toBeVisible();

    await sel.cartScreen.checkoutButton(secondPage, formatRupiah(PRICE)).click();
    await sel.cartScreen.fillCustomerDetails(
      secondPage,
      CUSTOMER_NAME,
      REGISTERED_WHATSAPP_NUMBER
    );

    const secondCheckoutResponsePromise = secondPage.waitForResponse(
      (response) =>
        response.url().includes('/carts/current/checkout') &&
        response.request().method() === 'POST'
    );
    await sel.cartScreen.submitNameButton(secondPage).click();
    const secondCheckoutResponse = await secondCheckoutResponsePromise;
    expect(secondCheckoutResponse.status()).toBe(200);
    await expect(secondPage).toHaveURL(/\/orders\//, { timeout: 5_000 });

    expect(
      await getValidateCallCount(NORMALIZED_REGISTERED_WHATSAPP_NUMBER)
    ).toBe(1);

    await context.close();
  });
});
