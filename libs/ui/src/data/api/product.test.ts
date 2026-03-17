import { productTransformers } from './product';

const apiCategory = {
  id: 1,
  name: 'Food',
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiProduct = {
  id: 1,
  name: 'Nasi Goreng',
  imageUrl: 'https://example.com/nasi-goreng.jpg',
  saleType: 'purchase' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
  categoryId: 1,
  category: apiCategory,
  description: 'Delicious fried rice',
  options: [
    {
      id: 1,
      name: 'Spice Level',
      values: [
        { id: 1, name: 'Mild' },
        { id: 2, name: 'Hot' },
      ],
    },
  ],
};

describe('productTransformers', () => {
  describe('category', () => {
    it('maps all fields correctly', () => {
      const result = productTransformers.category(apiCategory);
      expect(result).toEqual({
        id: 1,
        name: 'Food',
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });
  });

  describe('product', () => {
    it('maps all fields correctly', () => {
      const result = productTransformers.product(apiProduct);
      expect(result).toEqual({
        id: 1,
        name: 'Nasi Goreng',
        imageUrl: 'https://example.com/nasi-goreng.jpg',
        saleType: 'purchase',
        createdAt: '2024-03-20T00:00:00.000Z',
        category: {
          id: 1,
          name: 'Food',
          createdAt: '2024-03-20T00:00:00.000Z',
        },
        description: 'Delicious fried rice',
        options: [
          {
            id: 1,
            name: 'Spice Level',
            values: [
              { id: 1, name: 'Mild' },
              { id: 2, name: 'Hot' },
            ],
          },
        ],
      });
    });

    it('defaults description to empty string when undefined', () => {
      const result = productTransformers.product({ ...apiProduct, description: undefined });
      expect(result.description).toBe('');
    });
  });
});
