/**
 * Phase 5 (docs/prd-rental-checkout-mobile.md): Mobile E2E coverage for the
 * compact rental checkout flow.
 *
 * Runs only under the `mobile-chromium` project (phone viewport —
 * `devices['Pixel 5']`, see playwright.config.ts) and covers the compact
 * happy path end to end: an ongoing rental exists → open Checkout → tap the
 * rental in the full-screen list → the floating cart button shows the count
 * and running total → open the cart sheet → Grand Total is visible → Submit
 * → land on the transaction page.
 *
 * A second case covers the scanner path (PRD "How a rental gets into the
 * cart today", path 2): typing a rental's exact code into search adds it
 * with no tap, and the search field clears itself.
 *
 * Modeled directly on `rentals.checkin.mobile.spec.ts` (PRD "Precedent").
 * Rentals are seeded directly via `POST /api/rentals/checkin` (`api.
 * checkinRental`) instead of driving the checkin UI — this spec is only
 * about the checkout screen, mirroring how `transactions.mobile.spec.ts`
 * seeds products via API instead of the product form.
 *
 * No desktop spec is modified. Test data is isolated (distinct name/prefix)
 * so this spec can share the same database with every other suite despite
 * `workers: 1` serial execution.
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

// ---------------------------------------------------------------------------
// Constants — unique per test run to avoid collisions with other suites
// ---------------------------------------------------------------------------

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

    // A single wide tier so the subtotal is deterministic regardless of how
    // long the test takes to reach the assertion.
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
    // Safety net if the tap test failed before reaching Submit — a
    // successfully checked-out rental rejects deletion, so this is a no-op
    // on the happy path.
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

    // Compact layout lands directly on the full-screen ongoing-rental list —
    // the search input is the first thing visible, no cart card next to it.
    await expect(sel.rentalList.searchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    // No cart button yet — nothing has been tapped.
    await expect(sel.rentalCheckoutCartButton.button(page)).not.toBeVisible();

    // Find the seeded ongoing rental by its code and tap it.
    await sel.rentalList.searchInput(page).fill(RENTAL_CODE_TAP);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/rentals') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const rentalItem = sel.rentalList.rentalItem(page, CUSTOMER_NAME_TAP);
    await expect(rentalItem).toBeVisible({ timeout: 10_000 });
    await rentalItem.click();

    // The floating cart button appears, showing the count and the running
    // total — the list stays usable underneath.
    const cartButton = sel.rentalCheckoutCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(
      `1 item · Rp ${TIER_PRICE.toLocaleString('id')} · View Cart`
    );

    // Opening the cart reveals the sheet — the rental row plus a pinned
    // Grand Total + Submit footer.
    await cartButton.click();
    await expect(sel.rentalCheckoutCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: CUSTOMER_NAME_TAP }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Grand Total')).toBeVisible();

    // Submit — only one Submit button exists while the sheet is open.
    await sel.rentalCheckoutCartSheet.submitButton(page).click();

    // Success redirects straight to the transaction page — no dialog, and
    // the cart sheet must not be left painted over the destination (FR-3).
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

    // Typing the rental's exact code adds it with no tap at all — the
    // scanner path (PRD "How a rental gets into the cart today", path 2).
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

    // The search field clears itself once the rental lands in the cart.
    await expect(sel.rentalList.searchInput(page)).toHaveValue('');
  });
});
