import { variantTransformers } from './variant';

const apiCategory = {
  id: 1,
  name: 'Beverages',
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiProduct = {
  id: 1,
  name: 'Coffee',
  imageUrl: 'https://example.com/coffee.jpg',
  saleType: 'purchase' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
  categoryId: 1,
  category: apiCategory,
  options: [],
};

const apiVariant = {
  id: 1,
  name: 'Regular',
  price: 25000,
  createdAt: '2024-03-20T00:00:00.000Z',
  productId: 1,
  description: 'Regular size',
  product: apiProduct,
  materials: [
    {
      id: 1,
      variantId: 1,
      materialId: 1,
      amount: 0.05,
      createdAt: '2024-03-20T00:00:00.000Z',
      material: {
        id: 1,
        name: 'Coffee Beans',
        price: 200000,
        unit: 'kg',
        weeklyUsage: 5,
        createdAt: '2024-03-20T00:00:00.000Z',
      },
    },
  ],
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Regular' },
    },
  ],
};

describe('variantTransformers', () => {
  describe('variant', () => {
    it('maps all fields correctly', () => {
      const result = variantTransformers.variant(apiVariant);
      expect(result).toEqual({
        id: 1,
        name: 'Regular',
        price: 25000,
        createdAt: '2024-03-20T00:00:00.000Z',
        description: 'Regular size',
        product: {
          id: 1,
          name: 'Coffee',
          imageUrl: 'https://example.com/coffee.jpg',
          saleType: 'purchase',
          createdAt: '2024-03-20T00:00:00.000Z',
          category: {
            id: 1,
            name: 'Beverages',
            createdAt: '2024-03-20T00:00:00.000Z',
          },
          description: '',
          options: [],
        },
        materials: [
          {
            id: 1,
            materialId: 1,
            amount: 0.05,
            material: {
              id: 1,
              name: 'Coffee Beans',
              price: 200000,
              unit: 'kg',
              weeklyUsage: 5,
              createdAt: '2024-03-20T00:00:00.000Z',
              description: '',
            },
          },
        ],
        values: [
          {
            id: 1,
            variantId: 1,
            optionValueId: 1,
            optionValue: { id: 1, name: 'Regular' },
          },
        ],
      });
    });

    it('defaults description to empty string when undefined', () => {
      const result = variantTransformers.variant({ ...apiVariant, description: undefined });
      expect(result.description).toBe('');
    });
  });
});
