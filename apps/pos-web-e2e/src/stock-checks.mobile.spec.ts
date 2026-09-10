import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();

test.describe.serial('Stock Check Form (compact / mobile layout)', () => {
  test.describe('Edit — happy path', () => {
    const MATERIAL_NAME = `E2E MobileStockMaterial ${TS}`;

    let testMaterial: api.Material;
    let testStockCheck: api.StockCheck;

    test.beforeAll(async ({ request }) => {
      testMaterial = await api.createMaterial(request, {
        name: MATERIAL_NAME,
        price: 1000,
        unit: 'Gram',
        purchaseUnit: 'Dus (24 Pcs)',
        purchaseUnitSize: 24,
        minimumStock: 5,
        normalStock: 20,
        isStockCheckRequired: true,
      });

      testStockCheck = await api.createStockCheck(request, {
        items: [{ materialId: testMaterial.id, currentStock: 5 }],
      });
    });

    test.afterAll(async ({ request }) => {
      await api.deleteStockCheck(request, testStockCheck.id).catch(() => {
        // Ignore — may already be gone
      });
      await api.deleteMaterial(request, testMaterial.id).catch(() => {
        // Ignore — may already be gone
      });
    });

    test('should search, edit a count via the input and via +, and submit from the pinned bar', async ({
      page,
    }) => {
      await page.goto(`/stock-checks/${testStockCheck.id}/edit`);

      await expect(sel.stockCheckForm.searchInput(page)).toBeVisible({
        timeout: 15_000,
      });

      await sel.stockCheckForm.searchInput(page).fill(MATERIAL_NAME);

      const materialInput = sel.stockCheckForm.materialInput(
        page,
        MATERIAL_NAME
      );
      await expect(materialInput).toBeVisible({ timeout: 10_000 });
      await expect(materialInput).toHaveValue('5');

      await materialInput.fill('12');
      await expect(materialInput).toHaveValue('12');

      await sel.stockCheckForm.materialIncrementButton(page, MATERIAL_NAME).click();
      await expect(materialInput).toHaveValue('13');

      await sel.stockCheckForm.submitButton(page).click();

      await page.waitForURL('/stock-checks', { timeout: 15_000 });

      const updated = await api.getStockCheckById(page.request, testStockCheck.id);
      expect(updated.items.find((i) => i.materialId === testMaterial.id)?.currentStock).toBe(13);
    });
  });

  test.describe('Create — pending path', () => {
    const MATERIAL_NAME = `E2E MobileStockPendingMaterial ${TS}`;

    let testMaterial: api.Material;

    test.beforeAll(async ({ request }) => {
      testMaterial = await api.createMaterial(request, {
        name: MATERIAL_NAME,
        price: 1000,
        unit: 'Gram',
        purchaseUnit: 'PCS (15 Gram)',
        purchaseUnitSize: 15,
        minimumStock: 5,
        normalStock: 20,
        isStockCheckRequired: true,
      });
    });

    test.afterAll(async ({ request }) => {
      await api.deleteMaterial(request, testMaterial.id).catch(() => {
        // Ignore — may already be gone
      });
    });

    test('should show the pending banner, clear the search and engage the pending filter on a blocked submit', async ({
      page,
    }) => {
      await page.goto('/stock-checks/create');

      await expect(sel.stockCheckForm.searchInput(page)).toBeVisible({
        timeout: 15_000,
      });

      await sel.stockCheckForm.searchInput(page).fill(MATERIAL_NAME);
      await expect(sel.stockCheckForm.pendingBadge(page, MATERIAL_NAME)).toBeVisible({
        timeout: 10_000,
      });

      await expect(
        sel.stockCheckForm.pendingFilterButton(page, 'Show only pending')
      ).toBeVisible();

      await sel.stockCheckForm.submitButton(page).click();

      await expect(sel.stockCheckForm.errorBanner(page)).toBeVisible({
        timeout: 10_000,
      });

      await expect(sel.stockCheckForm.searchInput(page)).toHaveValue('');
      await expect(
        sel.stockCheckForm.pendingFilterButton(page, 'Show all materials')
      ).toBeVisible();

      await expect(sel.stockCheckForm.pendingBadge(page, MATERIAL_NAME)).toBeVisible();

      expect(page.url()).toContain('/stock-checks/create');
    });
  });
});
