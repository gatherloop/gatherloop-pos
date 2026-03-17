import { materialTransformers } from './material';

describe('materialTransformers', () => {
  describe('material', () => {
    it('maps all fields correctly including description', () => {
      const result = materialTransformers.material({
        id: 1,
        name: 'Sugar',
        price: 15000,
        unit: 'kg',
        weeklyUsage: 10,
        createdAt: '2024-03-20T00:00:00.000Z',
        description: 'Refined white sugar',
      });
      expect(result).toEqual({
        id: 1,
        name: 'Sugar',
        price: 15000,
        unit: 'kg',
        weeklyUsage: 10,
        createdAt: '2024-03-20T00:00:00.000Z',
        description: 'Refined white sugar',
      });
    });

    it('defaults description to empty string when undefined', () => {
      const result = materialTransformers.material({
        id: 2,
        name: 'Salt',
        price: 5000,
        unit: 'kg',
        weeklyUsage: 2,
        createdAt: '2024-03-21T00:00:00.000Z',
      });
      expect(result.description).toBe('');
    });
  });
});
