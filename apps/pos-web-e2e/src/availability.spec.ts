import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CATEGORY_NAME = `E2E AvailCategory ${TS}`;
const PRODUCT_NAME = `E2E AvailProduct ${TS}`;
const VARIANT_NAME = 'Standard';

test.describe.serial('Availability', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });

    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'purchase',
      options: [
        { name: 'Size', values: [{ name: VARIANT_NAME }, { name: 'Large' }] },
      ],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: VARIANT_NAME,
      price: 20_000,
      materials: [],
      values: [{ optionValueId }],
    });
  });

  test.afterAll(async ({ request }) => {
    await api.deleteVariant(request, testVariant.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteProduct(request, testProduct.id).catch(() => {
      // Ignore — may already be gone
    });
    await api.deleteCategory(request, testCategory.id).catch(() => {
      // Ignore — may already be gone
    });
  });

  test('product is sellable in the POS grid before being marked sold out', async ({
    page,
  }) => {
    await page.goto('/transactions/create');

    await sel.transactionForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const tile = sel.transactionForm.productTile(page, PRODUCT_NAME);
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await expect(tile.getByText('Sold out')).not.toBeVisible();

    await sel.transactionForm.productCard(page, PRODUCT_NAME).click();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit' }).last().click();

    await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });
  });

  test('marking the product sold out from the Availability screen', async ({
    page,
  }) => {
    await page.goto('/availability');

    await sel.availabilityForm.searchInput(page).fill(PRODUCT_NAME);

    const productSwitch = sel.availabilityForm.switchToggle(page, PRODUCT_NAME);
    await expect(productSwitch).toBeVisible({ timeout: 10_000 });
    await productSwitch.click();

    await sel.availabilityForm.saveButton(page).click();

    await expect(
      page.getByText('Update Availability Success', { exact: true })
    ).toBeVisible({ timeout: 10_000 });
    await expect(sel.availabilityForm.soldOutBadge(page, PRODUCT_NAME)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('sold-out product is shown but not selectable in the POS grid', async ({
    page,
  }) => {
    await page.goto('/transactions/create');

    await sel.transactionForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const tile = sel.transactionForm.productTile(page, PRODUCT_NAME);
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await expect(tile.getByText('Sold out')).toBeVisible();

    await tile.click();
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible({
      timeout: 2_000,
    });
  });
});
