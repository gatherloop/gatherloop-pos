/**
 * Phase 12: Table Ordering Happy Path
 *
 * Scan -> browse -> filter -> open item -> choose options -> add to cart ->
 * cart persists across reload -> edit quantity -> edit a line's amount/note
 * via the edit modal (FR-9) -> remove -> checkout CTA,
 * plus a deep-link test proving a hard-navigated
 * `/t/{code}/products/{productId}` link renders correctly with no
 * client-side navigation history.
 *
 * Runs against the real `next start` production server
 * (docs/trd-order-app-nextjs-migration.md P4) — no dev server, no static
 * export, matching how the app actually runs in production.
 *
 * Test data (a category, a decoy category, a two-variant product, a decoy
 * product and a table) is seeded once against the real API via
 * utils/api.ts — the customer app itself is anonymous (D3/D8 in
 * docs/prd-table-ordering.md) and has no create/login UI of its own.
 *
 * Tests run serially and share one browser session (Playwright reuses the
 * default context's cookies across tests in a file), which is exactly what
 * the anonymous session cookie (`gl_session_id`, D3) is for: the cart built
 * up over the course of this spec is the same cart from test to test.
 */

import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';
import { formatRupiah } from './utils/format';

const TS = Date.now();
const CATEGORY_NAME = `E2E Kategori ${TS}`;
const DECOY_CATEGORY_NAME = `E2E Kategori Lain ${TS}`;
const PRODUCT_NAME = `E2E Es Kopi Susu ${TS}`;
const DECOY_PRODUCT_NAME = `E2E Produk Lain ${TS}`;
const TABLE_LABEL = `E2E Meja ${TS}`;
const REGULAR_PRICE = 18000;
const LARGE_PRICE = 25000;
const NOTE = 'less sugar, tanpa es';

test.describe.serial('Table Ordering', () => {
  let category: api.Category;
  let decoyCategory: api.Category;
  let product: api.Product;
  let decoyProduct: api.Product;
  let variantRegular: api.Variant;
  let variantLarge: api.Variant;
  let table: api.Table;

  test.beforeAll(async () => {
    category = await api.createCategory({ name: CATEGORY_NAME, station: 'NONE' });
    decoyCategory = await api.createCategory({
      name: DECOY_CATEGORY_NAME,
      station: 'NONE',
    });

    product = await api.createProduct({
      categoryId: category.id,
      name: PRODUCT_NAME,
      description: 'Kopi susu dingin dengan es batu',
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: 'Reguler' }, { name: 'Besar' }] }],
    });
    decoyProduct = await api.createProduct({
      categoryId: decoyCategory.id,
      name: DECOY_PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [{ name: 'Ukuran', values: [{ name: 'Reguler' }] }],
    });

    const [regularValue, largeValue] = product.options[0].values;
    variantRegular = await api.createVariant({
      productId: product.id,
      name: 'Reguler',
      price: REGULAR_PRICE,
      materials: [],
      values: [{ optionValueId: regularValue.id }],
    });
    variantLarge = await api.createVariant({
      productId: product.id,
      name: 'Besar',
      price: LARGE_PRICE,
      materials: [],
      values: [{ optionValueId: largeValue.id }],
    });

    table = await api.createTable({ label: TABLE_LABEL });
  });

  test.afterAll(async () => {
    // Tolerant of partial failures mid-suite — a test that failed before
    // creating something further down the chain shouldn't stop cleanup of
    // what *did* get created.
    const cleanup = [
      () => api.deleteVariant(variantRegular.id),
      () => api.deleteVariant(variantLarge.id),
      () => api.deleteProduct(product.id),
      () => api.deleteProduct(decoyProduct.id),
      () => api.deleteCategory(category.id),
      () => api.deleteCategory(decoyCategory.id),
      () => api.deleteTable(table.id),
    ];
    for (const step of cleanup) {
      await step().catch(() => {
        // Ignore — the row may not exist if an earlier step failed.
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Scan: land on the menu, table label resolved from the QR code (D6/FR-4)
  // ---------------------------------------------------------------------------

  test('scanning the table QR shows the table label and the menu', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);

    await expect(sel.tableResolve.tableLabel(page, TABLE_LABEL)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.menuList.startingPrice(page, formatRupiah(REGULAR_PRICE))
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. Browse: search
  // ---------------------------------------------------------------------------

  test('searching the menu filters to matching products', async ({ page }) => {
    await page.goto(`t/${table.code}`);
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();

    await sel.menuList.searchInput(page).fill('produk yang tidak ada sama sekali');
    await expect(sel.menuList.emptyView(page)).toBeVisible();
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeHidden();

    await sel.menuList.searchInput(page).fill(PRODUCT_NAME);
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.menuList.productCard(page, DECOY_PRODUCT_NAME)
    ).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // 3. Browse: category chips (D4 — client-side grouping)
  // ---------------------------------------------------------------------------

  test('category chips filter the menu to that category', async ({ page }) => {
    await page.goto(`t/${table.code}`);
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.menuList.productCard(page, DECOY_PRODUCT_NAME)
    ).toBeVisible();

    await sel.menuList.categoryChip(page, CATEGORY_NAME).click();
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.menuList.productCard(page, DECOY_PRODUCT_NAME)
    ).toBeHidden();

    await sel.menuList.categoryChip(page, 'Semua').click();
    await expect(
      sel.menuList.productCard(page, DECOY_PRODUCT_NAME)
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. Item detail: open, choose an option, set quantity, add a note, add to
  //    cart (FR-6/FR-7)
  // ---------------------------------------------------------------------------

  test('opens an item, selects an option, sets quantity and a note, and adds it to the cart', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();

    await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`));
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();

    // No option selected yet — the CTA stays enabled with no price (FR-5).
    await expect(
      page.getByRole('button', { name: 'Tambah ke Keranjang', exact: true })
    ).toBeVisible();

    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await expect(
      page.getByRole('button', {
        name: `Tambah ke Keranjang · ${formatRupiah(REGULAR_PRICE)}`,
      })
    ).toBeVisible();

    // Quantity 1 -> 2, CTA price scales with it live.
    await sel.itemDetail.increaseAmountButton(page).click();
    await expect(
      page.getByRole('button', {
        name: `Tambah ke Keranjang · ${formatRupiah(REGULAR_PRICE * 2)}`,
      })
    ).toBeVisible();

    await sel.itemDetail.noteInput(page).fill(NOTE);
    await sel.itemDetail.addToCartButton(page).click();

    // Sheet closes back to the menu, floating cart bar now visible (D9/D14).
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}$`));
    await expect(sel.cartBar.viewCartButton(page)).toContainText(
      `2 item · ${formatRupiah(REGULAR_PRICE * 2)}`
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Cart survives a full reload (D3/D5 — server-side cart, session cookie)
  // ---------------------------------------------------------------------------

  test('the cart survives a full page reload', async ({ page }) => {
    await page.goto(`t/${table.code}`);
    await expect(sel.cartBar.viewCartButton(page)).toBeVisible();

    await page.reload();

    await expect(sel.cartBar.viewCartButton(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.cartBar.viewCartButton(page)).toContainText('2 item');
  });

  // ---------------------------------------------------------------------------
  // 6. Cart screen: line item detail, edit quantity, live total (D7/D14)
  // ---------------------------------------------------------------------------

  test('the cart screen shows the line item and updates the total when quantity changes', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.cartBar.viewCartButton(page).click();

    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
    await expect(page.getByText('Reguler')).toBeVisible();
    await expect(sel.cartScreen.lineItemNote(page, NOTE)).toBeVisible();
    await expect(
      sel.cartScreen.total(page, formatRupiah(REGULAR_PRICE * 2))
    ).toBeVisible();

    await sel.itemDetail.increaseAmountButton(page).click();

    await expect(
      sel.cartScreen.total(page, formatRupiah(REGULAR_PRICE * 3))
    ).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 6b. Cart line edit modal: change amount and note, save (FR-9)
  // ---------------------------------------------------------------------------

  test('editing a cart line\'s amount and note updates the line and the total', async ({
    page,
  }) => {
    const EDITED_NOTE = 'extra pahit';

    await page.goto(`t/${table.code}/cart`);
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.editButton(page, PRODUCT_NAME).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart/items/\\d+$`));

    await sel.itemDetail.increaseAmountButton(page).click();
    await sel.itemDetail.noteInput(page).fill(EDITED_NOTE);
    await sel.cartItemEdit.saveButton(page).click();

    // Modal closes back to the cart; the edited note and the recomputed
    // total (amount 3 -> 4, from test 6) are both visible.
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemNote(page, EDITED_NOTE)).toBeVisible();
    await expect(
      sel.cartScreen.total(page, formatRupiah(REGULAR_PRICE * 4))
    ).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 7. Remove the line item, cart goes empty
  // ---------------------------------------------------------------------------

  test('removing the item empties the cart', async ({ page }) => {
    await page.goto(`t/${table.code}/cart`);
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.removeButton(page, PRODUCT_NAME).click();

    await expect(sel.cartScreen.emptyView(page)).toBeVisible({
      timeout: 10_000,
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Checkout CTA: QRIS stub, creates nothing (FR-8/D10)
  // ---------------------------------------------------------------------------

  test('re-adding an item and checking out reaches the QRIS stub without submitting an order', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await sel.menuList.productCard(page, PRODUCT_NAME).click();
    await sel.itemDetail.optionValueChip(page, 'Besar').click();
    await expect(
      page.getByRole('button', {
        name: `Tambah ke Keranjang · ${formatRupiah(LARGE_PRICE)}`,
      })
    ).toBeVisible();
    await sel.itemDetail.addToCartButton(page).click();

    await sel.cartBar.viewCartButton(page).click();
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.checkoutButton(page).click();

    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/checkout$`));
    await expect(sel.checkout.qrisTitle(page)).toBeVisible();

    // No transaction is created by this screen (D10) — the cart the guest
    // built is exactly where they left it if they go back.
    await sel.checkout.backToCartButton(page).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 9. Deep link: a hard-navigated nested URL renders correctly via Next's
  //    real file-system route, with no client-side navigation history.
  // ---------------------------------------------------------------------------

  test('a hard-navigated deep link to the item detail route renders correctly', async ({
    browser,
  }) => {
    // A fresh context — no cookies, no client-side navigation history —
    // simulating a guest opening the printed QR's URL (or a shared link)
    // directly.
    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.goto(`t/${table.code}/products/${product.id}`);
    expect(response?.status()).toBe(200);

    await expect(sel.tableResolve.tableLabel(page, TABLE_LABEL)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();
    await expect(sel.itemDetail.optionValueChip(page, 'Reguler')).toBeVisible();

    await context.close();
  });
});
