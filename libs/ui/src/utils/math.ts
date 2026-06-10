export function roundToNearest500(num: number): number {
  return Math.round(num / 500) * 500;
}

export function applyCouponToBase(
  base: number,
  coupon: { type: 'fixed' | 'percentage'; amount: number }
): number {
  if (coupon.type === 'fixed') {
    return Math.min(coupon.amount, base);
  }

  return roundToNearest500((base * coupon.amount) / 100);
}
