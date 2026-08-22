import {
  calculateTransactionCouponDiscount,
  calculateTransactionCouponDiscounts,
  calculateTransactionFinalTotal,
  calculateTransactionItemsTotal,
} from './transactionCartTotal';

describe('calculateTransactionItemsTotal', () => {
  it('returns 0 for no items', () => {
    expect(calculateTransactionItemsTotal([])).toBe(0);
  });

  it('sums amount * price minus per-item discount', () => {
    expect(
      calculateTransactionItemsTotal([
        { amount: 2, price: 10000, discountAmount: 0 },
        { amount: 1, price: 25000, discountAmount: 5000 },
      ])
    ).toBe(2 * 10000 + (25000 - 5000));
  });
});

describe('calculateTransactionCouponDiscount', () => {
  it('discounts a fixed coupon by its raw amount', () => {
    expect(
      calculateTransactionCouponDiscount(30000, { type: 'fixed', amount: 5000 })
    ).toBe(5000);
  });

  it('discounts a percentage coupon rounded to the nearest 500', () => {
    expect(
      calculateTransactionCouponDiscount(30000, {
        type: 'percentage',
        amount: 40,
      })
    ).toBe(12000);
  });

  it('rounds a percentage discount that lands off-500 to the nearest 500', () => {
    expect(
      calculateTransactionCouponDiscount(45000, {
        type: 'percentage',
        amount: 10,
      })
    ).toBe(4500);
  });
});

describe('calculateTransactionCouponDiscounts', () => {
  it('applies coupons sequentially, each on top of the previous discount', () => {
    // 45000 -[10%]-> 40500 discount, running total 4500 left... actually
    // verify against a simpler, hand-checked stack: fixed then percentage.
    const discounts = calculateTransactionCouponDiscounts(50000, [
      { coupon: { type: 'fixed', amount: 10000 } },
      { coupon: { type: 'percentage', amount: 50 } },
    ]);

    expect(discounts[0]).toBe(10000);
    // second coupon applies to the running total after the first: 40000
    expect(discounts[1]).toBe(20000);
  });

  it('stacks two percentage coupons on the shrinking running total', () => {
    const discounts = calculateTransactionCouponDiscounts(40000, [
      { coupon: { type: 'percentage', amount: 25 } },
      { coupon: { type: 'percentage', amount: 25 } },
    ]);

    // 40000 * 25% = 10000, running total 30000
    expect(discounts[0]).toBe(10000);
    // 30000 * 25% = 7500, rounds to nearest 500 (already exact)
    expect(discounts[1]).toBe(7500);
  });

  it('returns an empty array for no coupons', () => {
    expect(calculateTransactionCouponDiscounts(10000, [])).toEqual([]);
  });
});

describe('calculateTransactionFinalTotal', () => {
  it('equals the items total when there are no coupons', () => {
    expect(
      calculateTransactionFinalTotal(
        [{ amount: 1, price: 20000, discountAmount: 0 }],
        []
      )
    ).toBe(20000);
  });

  it('subtracts a single fixed coupon from the items total', () => {
    expect(
      calculateTransactionFinalTotal(
        [{ amount: 1, price: 20000, discountAmount: 0 }],
        [{ coupon: { type: 'fixed', amount: 5000 } }]
      )
    ).toBe(15000);
  });

  it('stacks a fixed coupon followed by a percentage coupon', () => {
    // items total 50000, fixed -10000 -> 40000 left, then 50% of 40000 = -20000
    expect(
      calculateTransactionFinalTotal(
        [{ amount: 1, price: 50000, discountAmount: 0 }],
        [
          { coupon: { type: 'fixed', amount: 10000 } },
          { coupon: { type: 'percentage', amount: 50 } },
        ]
      )
    ).toBe(20000);
  });

  it('stacks two percentage coupons compounding on the running total', () => {
    // items total 40000, 25% -> -10000 (30000 left), 25% of 30000 -> -7500 (22500 left)
    expect(
      calculateTransactionFinalTotal(
        [{ amount: 1, price: 40000, discountAmount: 0 }],
        [
          { coupon: { type: 'percentage', amount: 25 } },
          { coupon: { type: 'percentage', amount: 25 } },
        ]
      )
    ).toBe(22500);
  });
});
