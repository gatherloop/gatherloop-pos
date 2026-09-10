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

  test('opens an item, selects an option, sets quantity and a note, and adds it to the cart', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);
    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();

    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) apiRequests.push(request.url());
    });

    await sel.menuList.productCard(page, PRODUCT_NAME).click();

    await expect(page).toHaveURL(new RegExp(`\\?product=${product.id}$`));
    await expect(page.getByText(PRODUCT_NAME).last()).toBeVisible();
    expect(apiRequests).toEqual([]);

    await expect(
      page.getByRole('button', { name: 'Tambah ke Keranjang', exact: true })
    ).toBeVisible();

    await sel.itemDetail.optionValueChip(page, 'Reguler').click();
    await expect(
      page.getByRole('button', {
        name: `Tambah ke Keranjang · ${formatRupiah(REGULAR_PRICE)}`,
      })
    ).toBeVisible();

    await sel.itemDetail.increaseAmountButton(page).click();
    await expect(
      page.getByRole('button', {
        name: `Tambah ke Keranjang · ${formatRupiah(REGULAR_PRICE * 2)}`,
      })
    ).toBeVisible();

    await sel.itemDetail.noteInput(page).fill(NOTE);
    await sel.itemDetail.addToCartButton(page).click();

    await expect(page).toHaveURL(new RegExp(`/t/${table.code}$`));
    await expect(sel.cartBar.viewCartButton(page)).toContainText(
      `2 item · ${formatRupiah(REGULAR_PRICE * 2)}`
    );
  });

  test('the cart survives a full page reload', async ({ page }) => {
    await page.goto(`t/${table.code}`);
    await expect(sel.cartBar.viewCartButton(page)).toBeVisible();

    await page.reload();

    await expect(sel.cartBar.viewCartButton(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(sel.cartBar.viewCartButton(page)).toContainText('2 item');
  });

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

  test('editing a cart line\'s amount and note updates the line and the total', async ({
    page,
  }) => {
    const EDITED_NOTE = 'extra pahit';

    await page.goto(`t/${table.code}/cart`);
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) apiRequests.push(request.url());
    });

    await sel.cartScreen.editButton(page, PRODUCT_NAME).click();
    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart\\?item=\\d+$`));
    expect(apiRequests).toEqual([]);

    await sel.itemDetail.increaseAmountButton(page).click();
    await sel.itemDetail.noteInput(page).fill(EDITED_NOTE);
    await sel.cartItemEdit.saveButton(page).click();

    await expect(page).toHaveURL(new RegExp(`/t/${table.code}/cart$`));
    await expect(sel.cartScreen.lineItemNote(page, EDITED_NOTE)).toBeVisible();
    await expect(
      sel.cartScreen.total(page, formatRupiah(REGULAR_PRICE * 4))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('removing the item empties the cart', async ({ page }) => {
    await page.goto(`t/${table.code}/cart`);
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();

    await sel.cartScreen.removeButton(page, PRODUCT_NAME).click();

    await expect(sel.cartScreen.emptyView(page)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('re-adding an item and checking out reaches the checkout summary without submitting an order', async ({
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
    await expect(sel.checkout.summaryTitle(page)).toBeVisible();
    await expect(
      sel.checkout.payButton(page, formatRupiah(LARGE_PRICE))
    ).toBeVisible();

    await page.goto(`t/${table.code}/cart`);
    await expect(sel.cartScreen.lineItemName(page, PRODUCT_NAME)).toBeVisible();
  });

  test('a hard-navigated deep link with a selected product renders the item sheet over the menu', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.goto(`t/${table.code}?product=${product.id}`);
    expect(response?.status()).toBe(200);

    await expect(sel.tableResolve.tableLabel(page, TABLE_LABEL)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(PRODUCT_NAME).last()).toBeVisible();
    await expect(sel.itemDetail.optionValueChip(page, 'Reguler')).toBeVisible();

    await context.close();
  });
});
