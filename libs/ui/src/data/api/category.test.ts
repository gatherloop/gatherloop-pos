import { categoryTransformers } from './category';

describe('categoryTransformers', () => {
  describe('category', () => {
    it('maps all fields correctly', () => {
      const result = categoryTransformers.category({
        id: 1,
        name: 'Beverages',
        createdAt: '2024-03-20T00:00:00.000Z',
      });
      expect(result).toEqual({
        id: 1,
        name: 'Beverages',
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });
  });
});
