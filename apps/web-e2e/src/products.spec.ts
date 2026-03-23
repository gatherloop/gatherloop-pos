/**
 * Phase 3: Product CRUD Flow
 *
 * Tests the full create → list → update → delete cycle with the real API.
 * Tests run serially — each builds on the previous test's state.
 *
 * Prerequisites:
 * - A test category is created via API in beforeAll and cleaned up in afterAll.
 * - Authentication is handled via storageState from global-setup.ts.
 *
 * Why this matters:
 * - Products are a dependency for the transaction flow (Phase 5)
 * - Validates the full SSR data-fetching pipeline: getServerSideProps → API → render
 * - Cross-page navigation (create → list → edit → list) with real database state
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// Unique names keyed by timestamp to avoid collisions with existing data
const TS = Date.now();
const PRODUCT_NAME = `E2E Product ${TS}`;
const UPDATED_PRODUCT_NAME = `E2E Product Updated ${TS}`;
const CATEGORY_NAME = `E2E Category ${TS}`;
const IMAGE_URL = 'https://placehold.co/400x400.jpg';

test.describe.serial('Product Management', () => {
  let testCategory: api.Category;
  // Tracks the product ID so afterAll can clean up if a test fails mid-way
  let createdProductId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, { name: CATEGORY_NAME });
  });

  test.afterAll(async ({ request }) => {
    // Clean up the product if it was not deleted by the delete test
    if (createdProductId !== undefined) {
      await api.deleteProduct(request, createdProductId).catch(() => {
        // Ignore — product may already be gone
      });
    }
    await api.deleteCategory(request, testCategory.id);
  });

  // ---------------------------------------------------------------------------
  // Test 1: Create
  // ---------------------------------------------------------------------------

  test('should create a new product with name and category', async ({
    page,
  }) => {
    await page.goto('/products/create');

    // Wait for the form to be loaded (categories fetched from API)
    await expect(sel.productForm.submitButton(page)).toBeVisible({
      timeout: 15_000,
    });

    // Fill in required fields
    await sel.productForm.nameInput(page).fill(PRODUCT_NAME);
    await sel.productForm.imageUrlInput(page).fill(IMAGE_URL);

    // Select the test category from the dropdown
    await sel.productForm.categorySelect(page).click();
    await page.getByText(CATEGORY_NAME, { exact: true }).click();

    // The form validation requires at least one option — add one via the Options tab
    await page.getByRole('tab', { name: 'Options' }).click();
    await page.getByRole('button', { name: 'Create Option' }).click();

    // Submit the form
    await sel.productForm.submitButton(page).click();

    // After successful creation the handler redirects to /products
    await page.waitForURL('/products', { timeout: 15_000 });
    await expect(page).toHaveURL('/products');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Verify in list
  // ---------------------------------------------------------------------------

  test('should display the created product in the product list', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Search
  // ---------------------------------------------------------------------------

  test('should search and find the product by name', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    await sel.productList.searchInput(page).fill(PRODUCT_NAME);

    // The matching product should remain visible
    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Update
  // ---------------------------------------------------------------------------

  test('should update the product name', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    // Open the context menu for the product
    await sel.productList.menuButton(page, PRODUCT_NAME).click();
    await sel.productList.menuOption(page, 'Edit').click();

    // Wait for navigation to the edit page and capture the product ID from the URL
    await page.waitForURL(/\/products\/\d+$/, { timeout: 15_000 });
    const urlMatch = page.url().match(/\/products\/(\d+)$/);
    if (urlMatch) {
      createdProductId = parseInt(urlMatch[1]);
    }

    // Wait for the form to load with current product data
    await expect(sel.productForm.nameInput(page)).toBeVisible({
      timeout: 15_000,
    });

    // Update the name field
    await sel.productForm.nameInput(page).clear();
    await sel.productForm.nameInput(page).fill(UPDATED_PRODUCT_NAME);

    // Submit the updated form
    await sel.productForm.submitButton(page).click();

    // Should redirect back to product list on success
    await page.waitForURL('/products', { timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Verify persisted update after reload
  // ---------------------------------------------------------------------------

  test('should verify updated data persists after page reload', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await page.reload();

    // Updated name should be visible
    await expect(
      sel.productList.productItem(page, UPDATED_PRODUCT_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Old name should no longer appear
    await expect(
      sel.productList.productItem(page, PRODUCT_NAME)
    ).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Delete
  // ---------------------------------------------------------------------------

  test('should delete the product and verify it is removed from the list', async ({
    page,
  }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });

    // Open context menu and trigger delete
    await sel.productList.menuButton(page, UPDATED_PRODUCT_NAME).click();
    await sel.productList.menuOption(page, 'Delete').click();

    // Confirm the delete alert dialog
    await sel.common.confirmButton(page).click();

    // Product should disappear from the list
    await expect(
      sel.productList.productItem(page, UPDATED_PRODUCT_NAME)
    ).not.toBeVisible({ timeout: 10_000 });

    // Mark as successfully deleted so afterAll doesn't try to delete again
    createdProductId = undefined;
  });
});
