/**
 * Phase 6 (docs/prd-stock-check-form-mobile.md): Mobile E2E coverage for the
 * compact stock check form.
 *
 * Runs only under the `mobile-chromium` project (phone viewport —
 * `devices['Pixel 5']`, see playwright.config.ts) and covers two paths:
 *
 * 1. The compact happy path on Edit: open an existing stock check, search a
 *    material, enter a count via the input and via the "+" stepper, submit
 *    from the pinned bar, and land back on `/stock-checks`.
 * 2. The pending path on Create: every row starts pending (`currentStock`
 *    seeds as `null` — see `create.tsx`'s `getServerSideProps`), so
 *    submitting immediately is blocked; the error banner appears, the
 *    search clears, and the pending filter engages.
 *
 * Modeled directly on `transactions.mobile.spec.ts` and
 * `rentals.checkin.mobile.spec.ts` (PRD "Precedent" / Phase 6 files).
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

      // Seeded directly via the API with a real count so this stock check
      // starts fully checked — isolated from whatever other required
      // materials exist in the shared DB (Update never reconciles against
      // the live material list, only the items stored on this record).
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

      // Compact layout: the search/filter header is pinned above the
      // scrolled row list.
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

      // Enter a count via the input directly.
      await materialInput.fill('12');
      await expect(materialInput).toHaveValue('12');

      // Then via the "+" stepper — confirms both entry paths from FR-2/FR-3
      // (≥44dp touch target, `minWidth` holding the input's readable size).
      await sel.stockCheckForm.materialIncrementButton(page, MATERIAL_NAME).click();
      await expect(materialInput).toHaveValue('13');

      // Nothing else is pending (this stock check has exactly one item), so
      // Submit is enabled — reachable from the pinned bar without scrolling.
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

      // The create form seeds every stock-check-required material with
      // `currentStock: null` (PRD "Context") — our new material starts
      // pending and shows the badge before any submit is attempted.
      await sel.stockCheckForm.searchInput(page).fill(MATERIAL_NAME);
      await expect(sel.stockCheckForm.pendingBadge(page, MATERIAL_NAME)).toBeVisible({
        timeout: 10_000,
      });

      // The pending filter starts off — nothing has forced it on yet.
      await expect(
        sel.stockCheckForm.pendingFilterButton(page, 'Show only pending')
      ).toBeVisible();

      // Submitting without filling anything is blocked — the shared DB's
      // other stock-check-required materials are pending too.
      await sel.stockCheckForm.submitButton(page).click();

      await expect(sel.stockCheckForm.errorBanner(page)).toBeVisible({
        timeout: 10_000,
      });

      // FR-6: the search clears and the pending filter force-engages so the
      // first pending row is reachable.
      await expect(sel.stockCheckForm.searchInput(page)).toHaveValue('');
      await expect(
        sel.stockCheckForm.pendingFilterButton(page, 'Show all materials')
      ).toBeVisible();

      // Our material is still pending, so it stays visible under the
      // pending filter even though the search that scoped it was cleared.
      await expect(sel.stockCheckForm.pendingBadge(page, MATERIAL_NAME)).toBeVisible();

      // Submission was blocked client-side — still on the create page.
      expect(page.url()).toContain('/stock-checks/create');
    });
  });
});
