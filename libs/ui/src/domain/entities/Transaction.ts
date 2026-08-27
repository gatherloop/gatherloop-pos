import { z } from 'zod';
import { Coupon, CouponType } from './Coupon';
import { Variant } from './Variant';
import { Wallet } from './Wallet';

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

export type Transaction = {
  id: number;
  createdAt: string;
  name: string;
  orderNumber: number;
  total: number;
  totalIncome: number;
  transactionItems: TransactionItem[];
  transactionCoupons: TransactionCoupon[];
  wallet: Wallet | null;
  paidAt: string | null;
  paidAmount: number;
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
  orderNumber: number;
  transactionItems: TransactionItemForm[];
  transactionCoupons: TransactionCouponForm[];
};

export type PaymentStatus = 'paid' | 'unpaid' | 'all';

export type TransactionPayForm = {
  wallet: Wallet;
  paidAmount: number;
};

// Partial validator, not a full parser (§4.4.2): only `wallet.id` is
// checked — `TransactionPaymentAlert` reads the rest of the selected
// `Wallet` (e.g. `isCashless`) straight from live form state, not from this
// schema's parsed output. It also closes over `transactionTotal`, which is
// only known at render time, so it is a factory rather than a module-level
// constant.
export const transactionPayFormSchema = (transactionTotal: number) =>
  z.object({
    wallet: z.object({ id: z.number() }),
    paidAmount: z.number().min(transactionTotal),
  });
