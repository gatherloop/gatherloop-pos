import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CATEGORY_NAME = `E2E AvailKategori ${TS}`;
const TABLE_LABEL = `E2E AvailMeja ${TS}`;
const SOLD_OUT_PRODUCT_NAME = `E2E SoldOut Kopi ${TS}`;
const CAPPED_PRODUCT_NAME = `E2E Capped Kopi ${TS}`;
const VARIANT_NAME = 'Reguler';
const PRICE = 18_000;
const REMAINING_QUANTITY = 2;

test.describe.serial('Availability (order app)', () => {
  let category: api.Category;
  let table: api.Table;

  let soldOutProduct: api.Product;
  let soldOutVariant: api.Variant;

  let cappedProduct: api.Product;
  let cappedVariant: api.Variant;

  test.beforeAll(async () => {
    category = await api.createCategory({ name: CATEGORY_NAME, station: 'NONE' });
    table = await api.createTable({ label: TABLE_LABEL });

    soldOutProduct = await api.createProduct({
      categoryId: category.id,
      name: SOLD_OUT_PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: VARIANT_NAME }] }],
    });
    soldOutVariant = await api.createVariant({
      productId: soldOutProduct.id,
      name: VARIANT_NAME,
      price: PRICE,
      materials: [],
      values: [{ optionValueId: soldOutProduct.options[0].values[0].id }],
    });
    await api.updateAvailability({
      variants: [{ variantId: soldOutVariant.id, isAvailable: false }],
    });

    cappedProduct = await api.createProduct({
      categoryId: category.id,
      name: CAPPED_PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      availabilityTracking: 'variant',
      options: [{ name: 'Ukuran', values: [{ name: VARIANT_NAME }] }],
    });
    cappedVariant = await api.createVariant({
      productId: cappedProduct.id,
      name: VARIANT_NAME,
      price: PRICE,
      materials: [],
      values: [{ optionValueId: cappedProduct.options[0].values[0].id }],
    });
    await api.updateAvailability({
      variants: [
        { variantId: cappedVariant.id, availableQuantity: REMAINING_QUANTITY },
      ],
    });
  });

  test.afterAll(async () => {
    const cleanup = [
      () => api.deleteVariant(soldOutVariant.id),
      () => api.deleteProduct(soldOutProduct.id),
      () => api.deleteVariant(cappedVariant.id),
      () => api.deleteProduct(cappedProduct.id),
      () => api.deleteCategory(category.id),
      () => api.deleteTable(table.id),
    ];
    for (const step of cleanup) {
      await step().catch(() => {
        // Ignore — the row may not exist if an earlier step failed.
      });
    }
  });

  test('a sold-out product shows the Habis badge and cannot be opened', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);

    const card = sel.menuList.productCard(page, SOLD_OUT_PRODUCT_NAME);
    await expect(card).toBeVisible();
    await expect(sel.menuList.soldOutBadge(page, SOLD_OUT_PRODUCT_NAME)).toBeVisible();

    await card.click();
    await expect(sel.itemDetail.addToCartButton(page)).not.toBeVisible({
      timeout: 2_000,
    });
    await expect(sel.itemDetail.soldOutAddToCartButton(page)).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('the amount stepper is capped at the remaining quantity', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);

    await sel.menuList.productCard(page, CAPPED_PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, VARIANT_NAME).click();

    await expect(sel.itemDetail.addToCartButton(page)).toBeEnabled();

    for (let i = 1; i < REMAINING_QUANTITY; i++) {
      await sel.itemDetail.increaseAmountButton(page).click();
    }

    await expect(
      sel.itemDetail.remainingQuantityHint(page, REMAINING_QUANTITY)
    ).toBeVisible();
    await expect(sel.itemDetail.increaseAmountButton(page)).toBeDisabled();

    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, CAPPED_PRODUCT_NAME)).toBeVisible();
  });

  test('checkout is blocked once a cart line goes sold out', async ({ page }) => {
    await page.goto(`t/${table.code}`);

    await sel.menuList.productCard(page, CAPPED_PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, VARIANT_NAME).click();
    await sel.itemDetail.addToCartButton(page).click();
    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, CAPPED_PRODUCT_NAME)).toBeVisible();

    await api.updateAvailability({
      variants: [{ variantId: cappedVariant.id, isAvailable: false }],
    });

    await page.reload();

    await expect(sel.cartScreen.lineItemName(page, CAPPED_PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.cartScreen.lineItemSoldOutBadge(page, CAPPED_PRODUCT_NAME)
    ).toBeVisible();
    await expect(sel.cartScreen.checkoutDisabledText(page)).toBeVisible();
  });
});
