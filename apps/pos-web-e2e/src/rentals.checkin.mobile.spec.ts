/**
 * Phase 6 (docs/prd-rental-checkin-mobile.md): Mobile E2E coverage for the
 * compact rental checkin flow.
 *
 * Runs only under the `mobile-chromium` project (phone viewport —
 * `devices['Pixel 5']`, see playwright.config.ts) and covers the compact
 * happy path end to end: open Checkin → pick a rental product → variant +
 * amount → the floating cart button shows the ticket count → open the cart
 * sheet → fill customer name + code → Submit → the print confirmation is
 * fully visible → decline → land on `/rentals`.
 *
 * Modeled directly on `transactions.mobile.spec.ts` (PRD "Precedent").
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
const CUSTOMER_NAME = `E2E Mobile Checkin Customer ${TS}`;
const PRODUCT_NAME = `E2E MobileRentalProduct ${TS}`;
const CATEGORY_NAME = `E2E MobileRentalCategory ${TS}`;
const TICKET_CODE = `E2EMOBILECHECKIN${TS}`;
const TICKET_NAME = `E2E Mobile Ticket ${TS}`;

const VARIANT_PRICE = 20_000;

test.describe.serial('Rental Checkin Flow (compact / mobile layout)', () => {
  let testCategory: api.Category;
  let testProduct: api.Product;
  let testVariant: api.Variant;
  let testTicket: api.Ticket;

  let createdRentalId: number | undefined;

  test.beforeAll(async ({ request }) => {
    testCategory = await api.createCategory(request, {
      name: CATEGORY_NAME,
    });

    // Two option values forces the variant/amount dialog to open instead of
    // checking in the ticket directly — same reasoning as the transaction
    // mobile spec.
    testProduct = await api.createProduct(request, {
      categoryId: testCategory.id,
      name: PRODUCT_NAME,
      imageUrl: 'https://placehold.co/400x400.jpg',
      saleType: 'rental',
      options: [
        { name: 'Size', values: [{ name: 'Standard' }, { name: 'Large' }] },
      ],
    });

    const optionValueId = testProduct.options[0]?.values[0]?.id;
    if (!optionValueId) {
      throw new Error('Product option value ID missing from API response');
    }

    testVariant = await api.createVariant(request, {
      productId: testProduct.id,
      name: 'Standard',
      price: VARIANT_PRICE,
      materials: [],
      values: [{ optionValueId }],
    });

    // A registered ticket so the code input shows the green "→ {name}"
    // lookup feedback instead of the "Unregistered card" warning.
    testTicket = await api.createTicket(request, {
      code: TICKET_CODE,
      name: TICKET_NAME,
    });
  });

  test.afterAll(async ({ request }) => {
    if (createdRentalId !== undefined) {
      await api.deleteRental(request, createdRentalId).catch(() => {
        // Ignore — may already be gone
      });
    }
    await api.deleteTicket(request, testTicket.id).catch(() => {
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

  test('should complete the compact happy path: pick rental product → variant → cart → submit → print → decline', async ({
    page,
    request,
  }) => {
    await page.goto('/rentals/checkin');

    // Compact layout lands directly on the full-screen ticket picker — the
    // search input is the first thing visible, no cart card next to it.
    await expect(sel.rentalCheckinForm.productSearchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    // No cart button yet — the cart is empty on a fresh Checkin.
    await expect(sel.rentalCartButton.button(page)).not.toBeVisible();

    // Search and select the rental product.
    await sel.rentalCheckinForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const productCard = sel.rentalCheckinForm.productCard(page, PRODUCT_NAME);
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    // The variant/amount dialog opens, resized for the viewport — detect it
    // via the Cancel button, same as the transaction mobile spec.
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit' }).last().click();
    await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

    // The floating cart button appears once the ticket lands, showing the
    // ticket count and codes-left — the product list stays usable underneath.
    const cartButton = sel.rentalCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(/^1 ticket · 1 code left ·/);
    await expect(productCard).toBeVisible();

    // Opening the cart reveals the sheet — Customer Name, the checkin-date
    // block and the ticket row just added, plus a pinned summary + Submit
    // footer.
    await cartButton.click();
    await expect(sel.rentalCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });

    await sel.rentalCheckinForm.customerNameInput(page).fill(CUSTOMER_NAME);
    await sel.rentalCheckinForm.codeInput(page).fill(TICKET_CODE);

    // Typing a registered code resolves the ticket-lookup feedback and
    // decrements "codes left" — the summary collapses once every code is
    // filled.
    await expect(page.getByText(`→ ${TICKET_NAME}`)).toBeVisible({
      timeout: 10_000,
    });

    // Submit — only one Submit button exists while the sheet is open (the
    // sheet unmounts its content when closed).
    await sel.rentalCheckinForm.submitButton(page).click();

    // Print confirmation appears — the cart sheet must have closed first
    // (FR-4) so the dialog is never stacked behind/over it, and both
    // buttons must be fully visible at the phone viewport (FR-5).
    const printDialog = sel.rentalPrintDialog.printCheckinSlipDialog(page);
    await expect(printDialog).toBeVisible({ timeout: 15_000 });
    await expect(sel.rentalCartSheet.title(page)).not.toBeVisible();

    // Both Cancel ("No") and Confirm ("Yes") must be reachable without
    // scrolling at the phone viewport (FR-5) — asserted by locator instead
    // of accessible name since AlertDialog.Cancel can override it (see
    // `rentalPrintDialog.clickNo`).
    const printDialogButtons = printDialog.locator('button');
    await expect(printDialogButtons).toHaveCount(2);
    await expect(printDialogButtons.first()).toBeVisible();
    await expect(printDialogButtons.last()).toBeVisible();

    await sel.rentalPrintDialog.clickNo(printDialog);

    await page.waitForURL('/rentals', { timeout: 15_000 });

    // Verify the rental landed correctly. The rental list searches by
    // ticket code, not customer name (PRD "Constraint" table has no
    // equivalent — this is simply how `RentalList` is implemented).
    await sel.rentalList.searchInput(page).fill(TICKET_CODE);
    await expect(
      sel.rentalList.rentalItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });

    // Capture the created rental's ID (no detail page to navigate to, so
    // fetch it directly) for cleanup.
    const matches = await api.findRentalsByCode(request, TICKET_CODE);
    createdRentalId = matches.find(
      (rental) => rental.code === TICKET_CODE
    )?.id;
  });
});
