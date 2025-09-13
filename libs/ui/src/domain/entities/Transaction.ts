import { Coupon, CouponType } from './Coupon';
import { Variant } from './Variant';
import { Wallet } from './Wallet';

type TransactionItem = {
  id: number;
  variant: Variant;
  amount: number;
  price: number;
  discountAmount: number;
  subtotal: number;
};

type TransactionCoupon = {
  id: number;
  coupon: Coupon;
  type: CouponType;
  amount: number;
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

type TransactionItemForm = {
  id?: number;
  variant: Variant;
  amount: number;
  discountAmount: number;
};

type TransactionCouponForm = {
  id?: number;
  coupon: Coupon;
};

export type TransactionForm = {
  name: string;
  orderNumber: number;
  transactionItems: TransactionItemForm[];
  transactionCoupons: TransactionCouponForm[];
};

export type PaymentStatus = 'paid' | 'unpaid' | 'all';
