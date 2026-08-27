import { z } from 'zod';

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

export const couponFormSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['fixed', 'percentage']),
  amount: z.number().min(1),
}) satisfies z.ZodType<CouponForm>;
