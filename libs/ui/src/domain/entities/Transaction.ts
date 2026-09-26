import { z } from 'zod';
import { Coupon, CouponType } from './Coupon';
import { Variant } from './Variant';
import { Wallet } from './Wallet';
import { PublicTable } from './PublicTable';
import { PaymentMethod } from './Payment';

export type TransactionItemValue = {
  id: number;
  optionName: string;
  optionValueName: string;
};

export type TransactionItem = {
  id: number;
  variant: Variant;
  amount: number;
  price: number;
  discountAmount: number;
  subtotal: number;
  note: string;
  productName: string;
  values: TransactionItemValue[];
};

export type TransactionCoupon = {
  id: number;
  coupon: Coupon;
  type: CouponType;
  amount: number;
  transactionItemId: number | null;
};

export type TransactionSource = 'pos' | 'order';

export type TransactionSourceFilter = TransactionSource | 'all';

export type TransactionDiningOption = 'dine_in' | 'takeaway';

export type TransactionFulfillmentStatus = 'preparing' | 'ready';

export type TransactionFulfillmentFilter = TransactionFulfillmentStatus | 'all';

export type TransactionPaymentVerificationStatus = 'awaiting' | 'approved';

export type Transaction = {
  id: number;
  createdAt: string;
  name: string;
  source: TransactionSource;
  diningOption: TransactionDiningOption;
  paymentMethod: PaymentMethod | null;
  paymentVerificationStatus: TransactionPaymentVerificationStatus | null;
  table: PublicTable | null;
  pagerNumber: number;
  transactionNumber: number;
  total: number;
  totalIncome: number;
  transactionItems: TransactionItem[];
  transactionCoupons: TransactionCoupon[];
  wallet: Wallet | null;
  paidAt: string | null;
  paidAmount: number;
  completedAt: string | null;
};

export type TransactionVerification = {
  photo: string;
  capturedAt: string;
};

export type TransactionCouponForm = {
  id?: number;
  coupon: Coupon;
};

type TransactionItemForm = {
  id?: number;
  variant: Variant;
  amount: number;
  price: number;
  discountAmount: number;
  note: string;
  coupon?: TransactionCouponForm;
};

export type TransactionForm = {
  name: string;
  pagerNumber: number;
  diningOption: TransactionDiningOption;
  transactionItems: TransactionItemForm[];
  transactionCoupons: TransactionCouponForm[];
};

export const transactionFormSchema = z.object({
  name: z.string().min(1),
  pagerNumber: z.number(),
  diningOption: z.enum(['dine_in', 'takeaway']),
  transactionItems: z
    .array(
      z.lazy(() =>
        z.object({
          amount: z.number().min(1),
          discountAmount: z.number(),
          note: z.string(),
        })
      )
    )
    .min(1),
});

export type PaymentStatus = 'paid' | 'unpaid' | 'all';

export type TransactionPayForm = {
  wallet: Wallet;
  paidAmount: number;
};

export const transactionPayFormSchema = (transactionTotal: number) =>
  z.object({
    wallet: z.object({ id: z.number() }),
    paidAmount: z.number().min(transactionTotal),
  });
