import { test, expect } from '@playwright/test';
import * as api from './utils/api';
import * as sel from './utils/selectors';

const TS = Date.now();
const CATEGORY_NAME = `E2E TagKategori ${TS}`;
const TABLE_LABEL = `E2E TagMeja ${TS}`;
const PRODUCT_NAME = `E2E Pancong ${TS}`;
const TAG_NAME = `E2E Baru ${TS}`;
const TAGGED_VARIANT_NAME = 'Es Krim';
const UNTAGGED_VARIANT_NAME = 'Coklat';
const TAGGED_VARIANT_PRICE = 22_000;
const UNTAGGED_VARIANT_PRICE = 15_000;

test.describe.serial('Highlighted tags (order app)', () => {
  let category: api.Category;
  let table: api.Table;
  let product: api.Product;
  let taggedVariant: api.Variant;
  let untaggedVariant: api.Variant;
  let tag: api.Tag;

  test.beforeAll(async () => {
    category = await api.createCategory({
      name: CATEGORY_NAME,
      station: 'NONE',
    });
    table = await api.createTable({ label: TABLE_LABEL });

    product = await api.createProduct({
      categoryId: category.id,
      name: PRODUCT_NAME,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [
        {
          name: 'Topping',
          values: [
            { name: UNTAGGED_VARIANT_NAME },
            { name: TAGGED_VARIANT_NAME },
          ],
        },
      ],
    });
    const [untaggedValue, taggedValue] = product.options[0].values;

    untaggedVariant = await api.createVariant({
      productId: product.id,
      name: UNTAGGED_VARIANT_NAME,
      price: UNTAGGED_VARIANT_PRICE,
      materials: [],
      values: [{ optionValueId: untaggedValue.id }],
    });
    taggedVariant = await api.createVariant({
      productId: product.id,
      name: TAGGED_VARIANT_NAME,
      price: TAGGED_VARIANT_PRICE,
      materials: [],
      values: [{ optionValueId: taggedValue.id }],
    });

    tag = await api.createTag({
      name: TAG_NAME,
      color: 'green',
      isHighlighted: true,
      sortOrder: 0,
    });
    await api.setTagVariants(tag.id, [taggedVariant.id]);
  });

  test.afterAll(async () => {
    const cleanup = [
      () => api.deleteTag(tag.id),
      () => api.deleteVariant(taggedVariant.id),
      () => api.deleteVariant(untaggedVariant.id),
      () => api.deleteProduct(product.id),
      () => api.deleteCategory(category.id),
      () => api.deleteTable(table.id),
    ];
    for (const step of cleanup) {
      await step().catch(() => {
        // Ignore — the row may not exist if an earlier step failed.
      });
    }
  });

  test('a highlight section appears above the categories', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);

    const highlightCard = sel.menuList.highlightCard(
      page,
      PRODUCT_NAME,
      TAGGED_VARIANT_NAME
    );
    await expect(highlightCard).toBeVisible();
    await expect(
      sel.menuList.tagSectionHeading(page, TAG_NAME).first()
    ).toBeVisible();

    const regularCard = sel.menuList.productCard(page, PRODUCT_NAME);
    await expect(regularCard).toBeVisible();

    const highlightBox = await highlightCard.boundingBox();
    const regularBox = await regularCard.boundingBox();
    expect(highlightBox?.y).toBeLessThan(regularBox?.y ?? Number.NEGATIVE_INFINITY);
  });

  test('a variant card opens the item with its option pre-selected', async ({
    page,
  }) => {
    await page.goto(`t/${table.code}`);

    await sel.menuList
      .highlightCard(page, PRODUCT_NAME, TAGGED_VARIANT_NAME)
      .click();

    await expect(sel.itemDetail.addToCartButton(page)).toBeEnabled();
    await expect(
      sel.itemDetail.addToCartButton(page).getByText(/22\.000/)
    ).toBeVisible();
  });

  test('the tag chip filters the menu to that tag', async ({ page }) => {
    await page.goto(`t/${table.code}`);

    await sel.menuList.tagChip(page, TAG_NAME).click();

    await expect(
      sel.menuList.highlightCard(page, PRODUCT_NAME, TAGGED_VARIANT_NAME)
    ).toBeVisible();
    await expect(
      sel.menuList.productCard(page, PRODUCT_NAME)
    ).toBeHidden();

    await sel.menuList.categoryChip(page, 'Semua').click();

    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
  });

  test('highlight sections are hidden while searching', async ({ page }) => {
    await page.goto(`t/${table.code}`);

    await sel.menuList.searchInput(page).fill(PRODUCT_NAME);

    await expect(sel.menuList.productCard(page, PRODUCT_NAME)).toBeVisible();
    await expect(
      sel.menuList.highlightCard(page, PRODUCT_NAME, TAGGED_VARIANT_NAME)
    ).toBeHidden();
  });
});
