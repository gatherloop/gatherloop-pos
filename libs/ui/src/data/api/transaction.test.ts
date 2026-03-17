import { transactionTransformers } from './transaction';

const apiWallet = {
  id: 1,
  name: 'Cash',
  balance: 2000000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const apiProduct = {
  id: 1,
  name: 'Coffee',
  imageUrl: 'https://example.com/coffee.jpg',
  saleType: 'purchase' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
  categoryId: 1,
  category: { id: 1, name: 'Beverages', createdAt: '2024-03-20T00:00:00.000Z' },
  options: [],
};

const apiVariant = {
  id: 1,
  name: 'Regular',
  price: 25000,
  createdAt: '2024-03-20T00:00:00.000Z',
  productId: 1,
  product: apiProduct,
  materials: [],
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Regular' },
    },
  ],
};

const apiTransaction = {
  id: 1,
  createdAt: '2024-03-20T00:00:00.000Z',
  name: 'Table 1',
  orderNumber: 42,
  total: 75000,
  totalIncome: 70000,
  paidAmount: 75000,
  paidAt: '2024-03-20T12:00:00.000Z',
  wallet: apiWallet,
  transactionItems: [
    {
      id: 1,
      transactionId: 1,
      variantId: 1,
      amount: 3,
      price: 25000,
      discountAmount: 0,
      subtotal: 75000,
      note: 'Less sugar',
      variant: apiVariant,
    },
  ],
  transactionCoupons: [
    {
      id: 1,
      transactionId: 1,
      couponId: 1,
      type: 'fixed' as const,
      amount: 10000,
      coupon: {
        id: 1,
        code: 'SAVE10K',
        type: 'fixed' as const,
        amount: 10000,
        createdAt: '2024-03-20T00:00:00.000Z',
      },
    },
  ],
};

describe('transactionTransformers', () => {
  describe('transactionStatistic', () => {
    it('maps all fields correctly', () => {
      const result = transactionTransformers.transactionStatistic({
        date: '2024-03-20',
        total: 500000,
        totalIncome: 450000,
      });
      expect(result).toEqual({
        date: '2024-03-20',
        total: 500000,
        totalIncome: 450000,
      });
    });
  });

  describe('transaction', () => {
    it('maps all fields correctly for paid transaction', () => {
      const result = transactionTransformers.transaction(apiTransaction);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Table 1');
      expect(result.orderNumber).toBe(42);
      expect(result.total).toBe(75000);
      expect(result.totalIncome).toBe(70000);
      expect(result.paidAmount).toBe(75000);
      expect(result.paidAt).toBe('2024-03-20T12:00:00.000Z');
    });

    it('sets paidAt to null when undefined', () => {
      const result = transactionTransformers.transaction({
        ...apiTransaction,
        paidAt: undefined,
        wallet: undefined,
      });
      expect(result.paidAt).toBeNull();
    });

    it('sets wallet to null when undefined', () => {
      const result = transactionTransformers.transaction({
        ...apiTransaction,
        wallet: undefined,
      });
      expect(result.wallet).toBeNull();
    });

    it('maps wallet correctly when present', () => {
      const result = transactionTransformers.transaction(apiTransaction);
      expect(result.wallet).toEqual({
        id: 1,
        name: 'Cash',
        balance: 2000000,
        paymentCostPercentage: 0,
        isCashless: false,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });

    it('maps transaction items correctly', () => {
      const result = transactionTransformers.transaction(apiTransaction);
      expect(result.transactionItems).toHaveLength(1);
      const item = result.transactionItems[0];
      expect(item.id).toBe(1);
      expect(item.amount).toBe(3);
      expect(item.price).toBe(25000);
      expect(item.discountAmount).toBe(0);
      expect(item.subtotal).toBe(75000);
      expect(item.note).toBe('Less sugar');
    });

    it('maps transaction coupons correctly', () => {
      const result = transactionTransformers.transaction(apiTransaction);
      expect(result.transactionCoupons).toHaveLength(1);
      const coupon = result.transactionCoupons[0];
      expect(coupon.id).toBe(1);
      expect(coupon.type).toBe('fixed');
      expect(coupon.amount).toBe(10000);
      expect(coupon.coupon.code).toBe('SAVE10K');
    });
  });
});
