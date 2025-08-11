import { Coupon, CouponForm } from '../entities';

export interface CouponRepository {
  fetchCouponList: () => Promise<Coupon[]>;

  fetchCouponById: (couponId: number) => Promise<Coupon>;

  deleteCouponById: (couponId: number) => Promise<void>;

  createCoupon: (formValues: CouponForm) => Promise<void>;

  updateCoupon: (formValues: CouponForm, couponId: number) => Promise<void>;
}
