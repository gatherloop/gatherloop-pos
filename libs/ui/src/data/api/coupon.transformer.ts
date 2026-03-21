// eslint-disable-next-line @nx/enforce-module-boundaries
import { Coupon as ApiCoupon } from '../../../../api-contract/src';
import { Coupon, CouponForm } from '../../domain';

export function toCoupon(coupon: ApiCoupon): Coupon {
  return {
    id: coupon.id,
    amount: coupon.amount,
    code: coupon.code,
    type: coupon.type,
    createdAt: coupon.createdAt,
  };
}

export function toApiCoupon(form: CouponForm) {
  return {
    code: form.code,
    type: form.type,
    amount: form.amount,
  };
}
