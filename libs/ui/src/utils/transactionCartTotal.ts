import { roundToNearest500 } from './math';

type TransactionCartTotalItem = {
  amount: number;
  price: number;
  discountAmount: number;
};

type TransactionCartTotalCoupon = {
  coupon: { type: 'fixed' | 'percentage'; amount: number };
};

export function calculateTransactionItemsTotal(
  items: TransactionCartTotalItem[]
): number {
  return items.reduce(
    (prev, curr) => prev + (curr.amount * curr.price - curr.discountAmount),
    0
  );
}

// Applies one coupon on top of a running total, matching how the
// transaction-coupon list applies discounts sequentially (each coupon
// discounts what's left after the ones before it).
export function calculateTransactionCouponDiscount(
  base: number,
  coupon: { type: 'fixed' | 'percentage'; amount: number }
): number {
  return coupon.type === 'fixed'
    ? coupon.amount
    : coupon.type === 'percentage'
    ? roundToNearest500((base * coupon.amount) / 100)
    : 0;
}

export function calculateTransactionCouponDiscounts(
  itemsTotal: number,
  coupons: TransactionCartTotalCoupon[]
): number[] {
  let runningTotal = itemsTotal;
  const discounts: number[] = [];
  for (const { coupon } of coupons) {
    const discount = calculateTransactionCouponDiscount(runningTotal, coupon);
    discounts.push(discount);
    runningTotal -= discount;
  }
  return discounts;
}

export function calculateTransactionFinalTotal(
  items: TransactionCartTotalItem[],
  coupons: TransactionCartTotalCoupon[]
): number {
  const itemsTotal = calculateTransactionItemsTotal(items);
  const discounts = calculateTransactionCouponDiscounts(itemsTotal, coupons);
  return discounts.reduce((total, discount) => total - discount, itemsTotal);
}
