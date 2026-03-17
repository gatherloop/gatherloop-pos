import { calculationTransformers } from './calculation';

const apiWallet = {
  id: 1,
  name: 'Cash',
  balance: 1000000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

describe('calculationTransformers', () => {
  describe('calculation', () => {
    it('maps all fields correctly', () => {
      const result = calculationTransformers.calculation({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T01:00:00.000Z',
        completedAt: '2024-03-20T02:00:00.000Z',
        totalCalculation: 500000,
        totalWallet: 1000000,
        walletId: 1,
        wallet: apiWallet,
        calculationItems: [
          { id: 1, calculationId: 1, amount: 10, price: 50000, subtotal: 500000 },
        ],
      });
      expect(result).toEqual({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T01:00:00.000Z',
        completedAt: '2024-03-20T02:00:00.000Z',
        totalCalculation: 500000,
        totalWallet: 1000000,
        wallet: {
          id: 1,
          name: 'Cash',
          balance: 1000000,
          paymentCostPercentage: 0,
          isCashless: false,
          createdAt: '2024-03-20T00:00:00.000Z',
        },
        calculationItems: [{ id: 1, amount: 10, price: 50000 }],
      });
    });

    it('sets completedAt to null when undefined', () => {
      const result = calculationTransformers.calculation({
        id: 2,
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T01:00:00.000Z',
        completedAt: undefined,
        totalCalculation: 500000,
        totalWallet: 1000000,
        walletId: 1,
        wallet: apiWallet,
        calculationItems: [],
      });
      expect(result.completedAt).toBeNull();
    });

    it('maps calculation items correctly', () => {
      const result = calculationTransformers.calculation({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T01:00:00.000Z',
        totalCalculation: 500000,
        totalWallet: 1000000,
        walletId: 1,
        wallet: apiWallet,
        calculationItems: [
          { id: 1, calculationId: 1, amount: 10, price: 50000, subtotal: 500000 },
        ],
      });
      expect(result.calculationItems).toHaveLength(1);
      expect(result.calculationItems[0]).toEqual({ id: 1, amount: 10, price: 50000 });
    });
  });
});
