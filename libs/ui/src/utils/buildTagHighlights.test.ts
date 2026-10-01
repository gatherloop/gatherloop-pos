import {
  Product,
  ProductTag,
  Tag,
  Variant,
  VariantTag,
} from '../domain/entities';
import { buildTagHighlights } from './buildTagHighlights';

const category = {
  id: 1,
  name: 'Menu',
  station: 'KITCHEN' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const newTag: Tag = {
  id: 1,
  name: 'New',
  color: 'green',
  isHighlighted: true,
  sortOrder: 1,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const bestSellerTag: Tag = {
  id: 2,
  name: 'Best Seller',
  color: 'orange',
  isHighlighted: true,
  sortOrder: 2,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const plainTag: Tag = {
  id: 3,
  name: 'Spicy',
  color: 'red',
  isHighlighted: false,
  sortOrder: 0,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const productTag = (
  tag: Tag,
  scope: ProductTag['scope'],
  variantIds: number[],
  taggedAt: string
): ProductTag => ({ tag, scope, variantIds, taggedAt });

const variantTag = (tag: Tag, taggedAt: string): VariantTag => ({
  tag,
  taggedAt,
});

const buildProduct = (
  id: number,
  name: string,
  tags: ProductTag[],
  isSellable = true
): Product => ({
  id,
  name,
  category,
  imageUrl: `https://example.com/${id}.jpg`,
  createdAt: '2024-01-01T00:00:00.000Z',
  options: [],
  saleType: 'purchase',
  status: 'published',
  isAvailable: isSellable,
  availabilityTracking: 'none',
  isSellable,
  tags,
});

const buildVariant = (
  id: number,
  name: string,
  product: Product,
  tags: VariantTag[],
  isSellable = true
): Variant => ({
  id,
  name,
  price: 10000,
  materials: [],
  product,
  createdAt: '2024-01-01T00:00:00.000Z',
  values: [],
  pricingTiers: [],
  isAvailable: isSellable,
  isSellable,
  tags,
});

const iceCreamTaggedAt = '2024-03-01T00:00:00.000Z';
const macchiatoTaggedAt = '2024-02-01T00:00:00.000Z';
const latteTaggedAt = '2024-02-15T00:00:00.000Z';

const pancong = buildProduct(1, 'Pancong', [
  productTag(newTag, 'variant', [14], iceCreamTaggedAt),
]);
const macchiato = buildProduct(2, 'Salted Caramel Macchiato', [
  productTag(newTag, 'product', [21], macchiatoTaggedAt),
]);
const latte = buildProduct(3, 'Coffee Latte', [
  productTag(bestSellerTag, 'product', [31, 32], latteTaggedAt),
]);

const pancongVariants = [
  buildVariant(11, 'Choco', pancong, []),
  buildVariant(12, 'Matcha', pancong, []),
  buildVariant(13, 'Vanilla', pancong, []),
  buildVariant(14, 'Ice Cream', pancong, [
    variantTag(newTag, iceCreamTaggedAt),
  ]),
];
const macchiatoVariants = [
  buildVariant(21, 'Original', macchiato, [
    variantTag(newTag, macchiatoTaggedAt),
  ]),
];
const latteVariants = [
  buildVariant(31, 'Hot', latte, [variantTag(bestSellerTag, latteTaggedAt)]),
  buildVariant(32, 'Iced', latte, [variantTag(bestSellerTag, latteTaggedAt)]),
];

const products = [pancong, macchiato, latte];
const variants = [...pancongVariants, ...macchiatoVariants, ...latteVariants];

describe('buildTagHighlights', () => {
  it('builds the New and Best Seller sections for the three cases', () => {
    const highlights = buildTagHighlights(products, variants);

    expect(highlights.map(({ tag }) => tag.name)).toEqual([
      'New',
      'Best Seller',
    ]);
    expect(highlights[0].entries).toEqual([
      { kind: 'variant', product: pancong, variant: pancongVariants[3] },
      { kind: 'product', product: macchiato },
    ]);
    expect(highlights[1].entries).toEqual([
      { kind: 'product', product: latte },
    ]);
  });

  it('does not build a section for a non-highlighted tag', () => {
    const spicy = buildProduct(4, 'Spicy Noodle', [
      productTag(plainTag, 'product', [41], '2024-03-01T00:00:00.000Z'),
    ]);
    const spicyVariant = buildVariant(41, 'Regular', spicy, [
      variantTag(plainTag, '2024-03-01T00:00:00.000Z'),
    ]);

    expect(buildTagHighlights([spicy], [spicyVariant])).toEqual([]);
  });

  it('drops a sold-out variant entry', () => {
    const soldOutIceCream = buildVariant(
      14,
      'Ice Cream',
      pancong,
      [variantTag(newTag, iceCreamTaggedAt)],
      false
    );

    const highlights = buildTagHighlights(
      [pancong, macchiato],
      [...pancongVariants.slice(0, 3), soldOutIceCream, ...macchiatoVariants]
    );

    expect(highlights[0].entries).toEqual([
      { kind: 'product', product: macchiato },
    ]);
  });

  it('drops a sold-out product entry', () => {
    const soldOutLatte = buildProduct(3, 'Coffee Latte', latte.tags, false);

    const highlights = buildTagHighlights([soldOutLatte], latteVariants);

    expect(highlights).toEqual([]);
  });

  it('drops a section whose entries are all sold out', () => {
    const soldOutIceCream = buildVariant(
      14,
      'Ice Cream',
      pancong,
      [variantTag(newTag, iceCreamTaggedAt)],
      false
    );

    expect(buildTagHighlights([pancong], [soldOutIceCream])).toEqual([]);
  });

  it('sorts a newer tagged variant ahead of an older tagged product', () => {
    const highlights = buildTagHighlights(
      [macchiato, pancong],
      [...macchiatoVariants, ...pancongVariants]
    );

    expect(highlights[0].entries).toEqual([
      { kind: 'variant', product: pancong, variant: pancongVariants[3] },
      { kind: 'product', product: macchiato },
    ]);
  });

  it('falls back to menu order when tagged at the same time', () => {
    const sameTime = '2024-03-01T00:00:00.000Z';
    const first = buildProduct(5, 'First', [
      productTag(newTag, 'product', [51], sameTime),
    ]);
    const second = buildProduct(6, 'Second', [
      productTag(newTag, 'product', [61], sameTime),
    ]);

    const highlights = buildTagHighlights([second, first], []);

    expect(highlights[0].entries).toEqual([
      { kind: 'product', product: second },
      { kind: 'product', product: first },
    ]);
  });

  it('orders sections by tag sort order', () => {
    const highlights = buildTagHighlights(
      [latte, macchiato],
      [...latteVariants, ...macchiatoVariants]
    );

    expect(highlights.map(({ tag }) => tag.sortOrder)).toEqual([1, 2]);
  });

  it('returns no sections for products without tags', () => {
    expect(buildTagHighlights([buildProduct(7, 'Plain', [])], [])).toEqual([]);
  });
});
