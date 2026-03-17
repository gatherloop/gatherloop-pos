import { walletTransformers } from './wallet';

const apiWallet = {
  id: 1,
  name: 'Cash',
  balance: 2000000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiWallet2 = {
  id: 2,
  name: 'GoPay',
  balance: 500000,
  paymentCostPercentage: 1.5,
  isCashless: true,
  createdAt: '2024-03-20T00:00:00.000Z',
};

describe('walletTransformers', () => {
  describe('wallet', () => {
    it('maps all fields correctly', () => {
      const result = walletTransformers.wallet(apiWallet);
      expect(result).toEqual({
        id: 1,
        name: 'Cash',
        balance: 2000000,
        paymentCostPercentage: 0,
        isCashless: false,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });

    it('maps cashless wallet correctly', () => {
      const result = walletTransformers.wallet(apiWallet2);
      expect(result.isCashless).toBe(true);
      expect(result.paymentCostPercentage).toBe(1.5);
    });
  });

  describe('walletTransfer', () => {
    it('maps all fields correctly', () => {
      const result = walletTransformers.walletTransfer({
        id: 1,
        amount: 200000,
        createdAt: '2024-03-20T00:00:00.000Z',
        fromWalletId: 1,
        fromWallet: apiWallet,
        toWalletId: 2,
        toWallet: apiWallet2,
      });
      expect(result).toEqual({
        id: 1,
        amount: 200000,
        createdAt: '2024-03-20T00:00:00.000Z',
        fromWallet: {
          id: 1,
          name: 'Cash',
          balance: 2000000,
          paymentCostPercentage: 0,
          isCashless: false,
          createdAt: '2024-03-20T00:00:00.000Z',
        },
        toWallet: {
          id: 2,
          name: 'GoPay',
          balance: 500000,
          paymentCostPercentage: 1.5,
          isCashless: true,
          createdAt: '2024-03-20T00:00:00.000Z',
        },
      });
    });
  });
});
