import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CUSTOMER_NAME_TAP = `E2E Mobile Checkout Tap ${TS}`;
const CUSTOMER_NAME_SCAN = `E2E Mobile Checkout Scan ${TS}`;
const PRODUCT_NAME = `E2E MobileRentalCheckoutProduct ${TS}`;
const CATEGORY_NAME = `E2E MobileRentalCheckoutCategory ${TS}`;
const RENTAL_CODE_TAP = `E2EMOBILECHECKOUTTAP${TS}`;
const RENTAL_CODE_SCAN = `E2EMOBILECHECKOUTSCAN${TS}`;

const TIER_PRICE = 25_000;

test.describe.serial('Rental Checkout Flow (compact / mobile layout)', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;

  let tapRental: api.Rental;
  let scanRental: api.Rental;
  let createdTransactionId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, {
      name: CATEGORY_NAME,
    });

    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'rental',
      options: [{ name: 'Size', values: [{ name: 'Standard' }] }],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: TIER_PRICE,
      materials: [],
      values: [{ optionValueId }],
      pricingTiers: [{ upToMinutes: 999_999, price: TIER_PRICE }],
    });

    const checkinAt = new Date(Date.now() - 5 * 60_000).toISOString();

    tapRental = await api.checkinRental(request, {
      code: RENTAL_CODE_TAP,
      name: CUSTOMER_NAME_TAP,
      variantId: testVariant.id,
      checkinAt,
    });

    scanRental = await api.checkinRental(request, {
      code: RENTAL_CODE_SCAN,
      name: CUSTOMER_NAME_SCAN,
      variantId: testVariant.id,
      checkinAt,
    });
  });

  test.afterAll(async ({ request }) => {
    if (createdTransactionId !== undefined) {
      await api.deleteTransaction(request, createdTransactionId).catch(() => {
        // Ignore — may already be gone
      });
    }
    await api.deleteRental(request, tapRental.id).catch(() => {
      // Ignore — may already be gone, or already checked out
    });
    await api.deleteRental(request, scanRental.id).catch(() => {
      // Ignore — may already be gone
    });
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

  test('should complete the compact happy path: tap the ongoing rental → cart → submit → land on the transaction page', async ({
    page,
  }) => {
    await page.goto('/rentals/checkout');

    await expect(sel.rentalList.searchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    await expect(sel.rentalCheckoutCartButton.button(page)).not.toBeVisible();

    await sel.rentalList.searchInput(page).fill(RENTAL_CODE_TAP);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/rentals') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const rentalItem = sel.rentalList.rentalItem(page, CUSTOMER_NAME_TAP);
    await expect(rentalItem).toBeVisible({ timeout: 10_000 });
    await rentalItem.click();

    const cartButton = sel.rentalCheckoutCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(
      `1 item · Rp ${TIER_PRICE.toLocaleString('id')} · View Cart`
    );

    await cartButton.click();
    await expect(sel.rentalCheckoutCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: CUSTOMER_NAME_TAP }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Grand Total')).toBeVisible();

    await sel.rentalCheckoutCartSheet.submitButton(page).click();

    await page.waitForURL(/\/transactions\/\d+$/, { timeout: 15_000 });
    await expect(sel.rentalCheckoutCartSheet.title(page)).not.toBeVisible();

    const match = page.url().match(/\/transactions\/(\d+)$/);
    if (match) {
      createdTransactionId = parseInt(match[1]);
    }
    await expect(page.getByText(CUSTOMER_NAME_TAP)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should add a rental via the exact-code-match (scanner) path with no tap, and clear the search field', async ({
    page,
  }) => {
    await page.goto('/rentals/checkout');

    await expect(sel.rentalList.searchInput(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.rentalCheckoutCartButton.button(page)).not.toBeVisible();

    await sel.rentalList.searchInput(page).fill(RENTAL_CODE_SCAN);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/rentals') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const cartButton = sel.rentalCheckoutCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(
      `1 item · Rp ${TIER_PRICE.toLocaleString('id')} · View Cart`
    );

    await expect(sel.rentalList.searchInput(page)).toHaveValue('');
  });
});
