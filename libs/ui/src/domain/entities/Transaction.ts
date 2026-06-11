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
