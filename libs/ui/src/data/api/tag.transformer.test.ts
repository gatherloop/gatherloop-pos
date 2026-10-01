import { toProduct } from './product.transformer';
import { toVariant } from './variant.transformer';

const apiTag = {
  id: 1,
  name: 'New',
  color: 'green' as const,
  isHighlighted: true,
  sortOrder: 1,
  variantCount: 1,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiProduct = {
  id: 1,
  name: 'Pancong',
  categoryId: 1,
  category: {
    id: 1,
    name: 'Menu',
    station: 'KITCHEN' as const,
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  imageUrl: 'https://example.com/pancong.jpg',
  createdAt: '2024-03-20T00:00:00.000Z',
  options: [],
  saleType: 'purchase' as const,
  status: 'published' as const,
  isAvailable: true,
  availabilityTracking: 'none' as const,
  isSellable: true,
  tags: [
    {
      tag: apiTag,
      scope: 'variant' as const,
      variantIds: [14],
      taggedAt: '2024-03-01T00:00:00.000Z',
    },
  ],
};

describe('tag transformers', () => {
  it('maps product tags', () => {
    expect(toProduct(apiProduct).tags).toEqual([
      {
        tag: apiTag,
        scope: 'variant',
        variantIds: [14],
        taggedAt: '2024-03-01T00:00:00.000Z',
      },
    ]);
  });

  it('maps variant tags and the nested product tags', () => {
    const variant = toVariant({
      id: 14,
      name: 'Ice Cream',
      price: 15000,
      productId: 1,
      product: apiProduct,
      createdAt: '2024-03-20T00:00:00.000Z',
      materials: [],
      values: [],
      pricingTiers: [],
      isAvailable: true,
      isSellable: true,
      tags: [{ tag: apiTag, taggedAt: '2024-03-01T00:00:00.000Z' }],
    } as unknown as Parameters<typeof toVariant>[0]);

    expect(variant.tags).toEqual([
      { tag: apiTag, taggedAt: '2024-03-01T00:00:00.000Z' },
    ]);
    expect(variant.product.tags).toHaveLength(1);
  });
});
