import { budgetTransformers } from './budget';

describe('budgetTransformers', () => {
  describe('budget', () => {
    it('maps all fields correctly', () => {
      const result = budgetTransformers.budget({
        id: 1,
        name: 'Operations',
        balance: 5000000,
        percentage: 30,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
      expect(result).toEqual({
        id: 1,
        name: 'Operations',
        balance: 5000000,
        percentage: 30,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });
  });
});
