import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

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

    await expect(sel.rentalCheckinForm.productSearchInput(page)).toBeVisible({
      timeout: 15_000,
    });

    await expect(sel.rentalCartButton.button(page)).not.toBeVisible();

    await sel.rentalCheckinForm.productSearchInput(page).fill(PRODUCT_NAME);
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/products') && resp.status() === 200,
      { timeout: 15_000 }
    );

    const productCard = sel.rentalCheckinForm.productCard(page, PRODUCT_NAME);
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit' }).last().click();
    await expect(cancelButton).not.toBeVisible({ timeout: 10_000 });

    const cartButton = sel.rentalCartButton.button(page);
    await expect(cartButton).toBeVisible({ timeout: 10_000 });
    await expect(cartButton).toHaveText(/^1 ticket · 1 code left ·/);
    await expect(productCard).toBeVisible();

    await cartButton.click();
    await expect(sel.rentalCartSheet.title(page)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('p').filter({ hasText: PRODUCT_NAME }).first()
    ).toBeVisible({ timeout: 10_000 });

    await sel.rentalCheckinForm.customerNameInput(page).fill(CUSTOMER_NAME);
    await sel.rentalCheckinForm.codeInput(page).fill(TICKET_CODE);

    await expect(page.getByText(`→ ${TICKET_NAME}`)).toBeVisible({
      timeout: 10_000,
    });

    await sel.rentalCheckinForm.submitButton(page).click();

    const printDialog = sel.rentalPrintDialog.printCheckinSlipDialog(page);
    await expect(printDialog).toBeVisible({ timeout: 15_000 });
    await expect(sel.rentalCartSheet.title(page)).not.toBeVisible();

    const printDialogButtons = printDialog.locator('button');
    await expect(printDialogButtons).toHaveCount(2);
    await expect(printDialogButtons.first()).toBeVisible();
    await expect(printDialogButtons.last()).toBeVisible();

    await sel.rentalPrintDialog.clickNo(printDialog);

    await page.waitForURL('/rentals', { timeout: 15_000 });

    await sel.rentalList.searchInput(page).fill(TICKET_CODE);
    await expect(
      sel.rentalList.rentalItem(page, CUSTOMER_NAME)
    ).toBeVisible({ timeout: 15_000 });

    const matches = await api.findRentalsByCode(request, TICKET_CODE);
    createdRentalId = matches.find(
      (rental) => rental.code === TICKET_CODE
    )?.id;
  });
});
