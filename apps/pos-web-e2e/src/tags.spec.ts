import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const TAG_NAME = `E2E Tag ${TS}`;
const CATEGORY_NAME = `E2E TagCategory ${TS}`;
const PRODUCT_NAME = `E2E TagProduct ${TS}`;
const PRICE = 25_000;

test.describe.serial('Tag Management', () => {
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
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: PRICE,
      materials: [],
      values: [{ optionValueId }],
    });
  });

  test.afterAll(async ({ request }) => {
    const tags = await api.listTags(request).catch(() => []);
    for (const tag of tags.filter((candidate) => candidate.name === TAG_NAME)) {
      await api.deleteTag(request, tag.id).catch(() => {
        // Ignore — tag may already be gone
      });
    }
    await api.deleteVariant(request, testVariant.id).catch(() => {
      // Ignore — variant may already be gone
    });
    await api.deleteProduct(request, testProduct.id).catch(() => {
      // Ignore — product may already be gone
    });
    await api.deleteCategory(request, testCategory.id).catch(() => {
      // Ignore — category may already be gone
    });
  });

  test('should create a new tag', async ({ page }) => {
    await page.goto('/tags/create');

    await expect(sel.tagForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.tagForm.nameInput(page).fill(TAG_NAME);
    await sel.tagForm.colorOption(page, 'Green').click();

    await sel.tagForm.submitButton(page).click();

    await page.waitForURL('/tags', { timeout: 15_000 });
    await expect(sel.tagList.tagItem(page, TAG_NAME)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.tagList.variantCount(page, TAG_NAME, 0)).toBeVisible();
  });

  test('should assign the tag to a product', async ({ page }) => {
    await page.goto('/tags', { waitUntil: 'domcontentloaded' });

    await sel.tagList.menuButton(page, TAG_NAME).click();
    await sel.tagList.menuOption(page, 'Assign products').click();

    await page.waitForURL(/\/tags\/\d+\/assign$/, { timeout: 15_000 });

    await sel.tagAssignment.searchInput(page).fill(PRODUCT_NAME);
    const productCheckbox = sel.tagAssignment.productCheckbox(
      page,
      PRODUCT_NAME
    );
    await expect(productCheckbox).toBeVisible({ timeout: 15_000 });
    await productCheckbox.click();
    await expect(productCheckbox).toBeChecked();

    await sel.tagAssignment.saveButton(page).click();

    await page.waitForURL('/tags', { timeout: 15_000 });
    await expect(sel.tagList.variantCount(page, TAG_NAME, 1)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should show the tag badge in the transaction item picker', async ({
    page,
  }) => {
    await page.goto('/transactions/create');

    await expect(sel.transactionForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    await sel.transactionForm.productSearchInput(page).fill(PRODUCT_NAME);

    const productCard = sel.transactionForm.productCard(page, PRODUCT_NAME);
    await expect(productCard).toBeVisible({ timeout: 15_000 });
    await expect(
      productCard.locator('xpath=../..').getByText(TAG_NAME, { exact: true })
    ).toBeVisible();
  });

  test('should delete the tag', async ({ page }) => {
    await page.goto('/tags', { waitUntil: 'domcontentloaded' });

    await sel.tagList.menuButton(page, TAG_NAME).click();
    await sel.tagList.menuOption(page, 'Delete').click();
    await sel.common.confirmButton(page).click();

    await expect(sel.tagList.tagItem(page, TAG_NAME)).toBeHidden({
      timeout: 10_000,
    });
  });
});
