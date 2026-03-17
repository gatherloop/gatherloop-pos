import { expenseTransformers } from './expense';

const apiWallet = {
  id: 1,
  name: 'Cash',
  balance: 2000000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiBudget = {
  id: 1,
  name: 'Operations',
  balance: 5000000,
  percentage: 30,
  createdAt: '2024-03-20T00:00:00.000Z',
};

describe('expenseTransformers', () => {
  describe('expense', () => {
    it('maps all fields correctly', () => {
      const result = expenseTransformers.expense({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        total: 150000,
        walletId: 1,
        wallet: apiWallet,
        budgetId: 1,
        budget: apiBudget,
        expenseItems: [
          {
            id: 1,
            expenseId: 1,
            name: 'Coffee Beans',
            unit: 'kg',
            price: 50000,
            amount: 3,
            subtotal: 150000,
          },
        ],
      });
      expect(result).toEqual({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        total: 150000,
        wallet: {
          id: 1,
          name: 'Cash',
          balance: 2000000,
          paymentCostPercentage: 0,
          isCashless: false,
          createdAt: '2024-03-20T00:00:00.000Z',
        },
        budget: {
          id: 1,
          name: 'Operations',
          balance: 5000000,
          percentage: 30,
          createdAt: '2024-03-20T00:00:00.000Z',
        },
        expenseItems: [
          { id: 1, name: 'Coffee Beans', unit: 'kg', price: 50000, amount: 3 },
        ],
      });
    });

    it('maps expense items correctly', () => {
      const result = expenseTransformers.expense({
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        total: 150000,
        walletId: 1,
        wallet: apiWallet,
        budgetId: 1,
        budget: apiBudget,
        expenseItems: [
          {
            id: 1,
            expenseId: 1,
            name: 'Coffee Beans',
            unit: 'kg',
            price: 50000,
            amount: 3,
            subtotal: 150000,
          },
        ],
      });
      expect(result.expenseItems).toHaveLength(1);
      expect(result.expenseItems[0]).toEqual({
        id: 1,
        name: 'Coffee Beans',
        unit: 'kg',
        price: 50000,
        amount: 3,
      });
    });
  });
});
