import { ProductTag, Tag } from '../domain/entities';
import { buildTagBadges } from './buildTagBadges';

const buildTag = (
  id: number,
  name: string,
  sortOrder: number,
  color: Tag['color'] = 'green'
): Tag => ({
  id,
  name,
  color,
  isHighlighted: true,
  sortOrder,
  variantCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const buildProductTag = (
  tag: Tag,
  scope: ProductTag['scope'],
  variantIds: number[]
): ProductTag => ({
  tag,
  scope,
  variantIds,
  taggedAt: '2024-01-01T00:00:00.000Z',
});

const newTag = buildTag(1, 'New', 1);
const bestSellerTag = buildTag(2, 'Best Seller', 2, 'orange');
const spicyTag = buildTag(3, 'Spicy', 3, 'red');

describe('buildTagBadges', () => {
  it('returns no badges for an untagged product', () => {
    expect(buildTagBadges([])).toEqual({ badges: [], overflowCount: 0 });
  });

  it('labels a product-scope tag with the tag name', () => {
    const { badges } = buildTagBadges([
      buildProductTag(bestSellerTag, 'product', [1, 2]),
    ]);

    expect(badges).toEqual([
      { key: '2', label: 'Best Seller', color: 'orange' },
    ]);
  });

  it('names the variant for a single-variant scope tag', () => {
    const { badges } = buildTagBadges(
      [buildProductTag(newTag, 'variant', [10])],
      { 10: 'Ice Cream' }
    );

    expect(badges[0].label).toBe('New · Ice Cream');
  });

  it('counts variants when more than one variant is tagged', () => {
    const { badges } = buildTagBadges(
      [buildProductTag(newTag, 'variant', [10, 11])],
      { 10: 'Ice Cream', 11: 'Chocolate' }
    );

    expect(badges[0].label).toBe('New · 2 varian');
  });

  it('falls back to the variant count when the variant name is unknown', () => {
    const { badges } = buildTagBadges([
      buildProductTag(newTag, 'variant', [10]),
    ]);

    expect(badges[0].label).toBe('New · 1 varian');
  });

  it('shows at most two badges in tag sort order and counts the rest', () => {
    const { badges, overflowCount } = buildTagBadges([
      buildProductTag(spicyTag, 'product', [1]),
      buildProductTag(newTag, 'product', [1]),
      buildProductTag(bestSellerTag, 'product', [1]),
    ]);

    expect(badges.map(({ label }) => label)).toEqual(['New', 'Best Seller']);
    expect(overflowCount).toBe(1);
  });
});
