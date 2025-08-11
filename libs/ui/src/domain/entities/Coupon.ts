export type CouponType = 'fixed' | 'percentage';

export type Coupon = {
  id: number;
  code: string;
  type: CouponType;
  amount: number;
  createdAt: string;
};

export type CouponForm = {
  code: string;
  type: CouponType;
  amount: number;
};
