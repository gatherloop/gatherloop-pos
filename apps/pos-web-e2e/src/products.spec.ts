import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const PRODUCT_NAME = `E2E Product ${TS}`;
const UPDATED_PRODUCT_NAME = `E2E Product Updated ${TS}`;
const CATEGORY_NAME = `E2E Category ${TS}`;
const IMAGE_URL = 'https://placehold.co/400x400.jpg';

test.describe.serial('Product Management', () => {
  let testCategory: api.Category;
  let createdProductId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });
  });

  test.afterAll(async ({ request }) => {
    if (createdProductId !== undefined) {
      await api.deleteProduct(request, createdProductId).catch(() => {
        // Ignore — product may already be gone
      });
    }
    await api.deleteCategory(request, testCategory.id);
  });

  test('should create a new product with name and category', async ({
    page,
  }) => {
    await page.goto('/products/create');

    await expect(sel.productForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.productForm.nameInput(page).fill(PRODUCT_NAME);
    await sel.productForm.imageUrlInput(page).fill(IMAGE_URL);

    await sel.productForm.categorySelect(page).click();
    await page.getByText(CATEGORY_NAME, { exact: true }).click();

    await page.getByRole('tab', { name: 'Options' }).click();
    await page.getByRole('button', { name: 'Create Option' }).click();

    await sel.productForm.submitButton(page).click();

    await page.waitForURL('/products', { timeout: 15_000 });
    await expect(page).toHaveURL('/products');
  });

  test('should display the created product in the product list', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should search and find the product by name', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await sel.productList.searchInput(page).fill(PRODUCT_NAME);

    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should update the product name', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await sel.productList.menuButton(page, PRODUCT_NAME).click();
    await sel.productList.menuOption(page, 'Edit').click();

    await page.waitForURL(/\/products\/\d+$/, { timeout: 15_000 });
    const urlMatch = page.url().match(/\/products\/(\d+)$/);
    if (urlMatch) {
      createdProductId = parseInt(urlMatch[1]);
    }

    await expect(sel.productForm.nameInput(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.productForm.nameInput(page).clear();
    await sel.productForm.nameInput(page).fill(UPDATED_PRODUCT_NAME);

    await sel.productForm.submitButton(page).click();

    await page.waitForURL('/products', { timeout: 15_000 });
  });

  test('should verify updated data persists after page reload', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await page.reload();

    await expect(
      sel.productList.productItem(page, UPDATED_PRODUCT_NAME)
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).not.toBeVisible();
  });

  test('should delete the product and verify it is removed from the list', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await sel.productList.menuButton(page, UPDATED_PRODUCT_NAME).click();
    await sel.productList.menuOption(page, 'Delete').click();

    await sel.common.confirmButton(page).click();

    await expect(
      sel.productList.productItem(page, UPDATED_PRODUCT_NAME)
    ).not.toBeVisible({ timeout: 10_000 });

    createdProductId = undefined;
  });
});
