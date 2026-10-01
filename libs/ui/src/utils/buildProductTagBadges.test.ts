import { ProductTag, Tag } from '../domain/entities';
import { buildProductTagBadges } from './buildProductTagBadges';

const makeTag = (overrides: Partial<Tag> & Pick<Tag, 'id' | 'name'>): Tag => ({
  color: 'blue',
  isHighlighted: true,
  sortOrder: overrides.id,
  variantCount: 0,
  createdAt: '2024-03-20T00:00:00.000Z',
  ...overrides,
});

const makeProductTag = (
  tag: Tag,
  scope: ProductTag['scope'] = 'product',
  variantIds: number[] = []
): ProductTag => ({
  tag,
  scope,
  variantIds,
  taggedAt: '2024-03-20T00:00:00.000Z',
});

describe('buildProductTagBadges', () => {
  it('labels a product-scope tag with the tag name', () => {
    const { badges, overflowCount } = buildProductTagBadges([
      makeProductTag(makeTag({ id: 1, name: 'Best Seller', color: 'orange' })),
    ]);

    expect(badges).toEqual([
      { key: 1, label: 'Best Seller', color: 'orange' },
    ]);
    expect(overflowCount).toBe(0);
  });

  it('labels a single-variant tag with the variant name', () => {
    const { badges } = buildProductTagBadges(
      [makeProductTag(makeTag({ id: 1, name: 'New' }), 'variant', [10])],
      { 10: 'Ice Cream' }
    );

    expect(badges[0].label).toBe('New · Ice Cream');
  });

  it('labels a multi-variant tag with the variant count', () => {
    const { badges } = buildProductTagBadges(
      [makeProductTag(makeTag({ id: 1, name: 'New' }), 'variant', [10, 11])],
      { 10: 'Ice Cream', 11: 'Matcha' }
    );

    expect(badges[0].label).toBe('New · 2 varian');
  });

  it('falls back to the tag name when the variant name is unknown', () => {
    const { badges } = buildProductTagBadges([
      makeProductTag(makeTag({ id: 1, name: 'New' }), 'variant', [10]),
    ]);

    expect(badges[0].label).toBe('New');
  });

  it('orders badges by tag sort order and caps them at two with an overflow count', () => {
    const { badges, overflowCount } = buildProductTagBadges([
      makeProductTag(makeTag({ id: 1, name: 'C', sortOrder: 3 })),
      makeProductTag(makeTag({ id: 2, name: 'A', sortOrder: 1 })),
      makeProductTag(makeTag({ id: 3, name: 'B', sortOrder: 2 })),
    ]);

    expect(badges.map((badge) => badge.label)).toEqual(['A', 'B']);
    expect(overflowCount).toBe(1);
  });

  it('returns nothing for a product without tags', () => {
    expect(buildProductTagBadges([])).toEqual({
      badges: [],
      overflowCount: 0,
    });
  });
});
