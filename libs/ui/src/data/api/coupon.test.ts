import { couponTransformers } from './coupon';

describe('couponTransformers', () => {
  describe('coupon', () => {
    it('maps fixed coupon fields correctly', () => {
      const result = couponTransformers.coupon({
        id: 1,
        code: 'SAVE10K',
        type: 'fixed',
        amount: 10000,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
      expect(result).toEqual({
        id: 1,
        code: 'SAVE10K',
        type: 'fixed',
        amount: 10000,
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });

    it('maps percentage coupon fields correctly', () => {
      const result = couponTransformers.coupon({
        id: 2,
        code: 'DISC20',
        type: 'percentage',
        amount: 20,
        createdAt: '2024-03-21T00:00:00.000Z',
      });
      expect(result).toEqual({
        id: 2,
        code: 'DISC20',
        type: 'percentage',
        amount: 20,
        createdAt: '2024-03-21T00:00:00.000Z',
      });
    });
  });
});
