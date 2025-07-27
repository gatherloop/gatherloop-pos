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

export type Transaction = {
  id: number;
  createdAt: string;
  name: string;
  total: number;
  totalIncome: number;
  transactionItems: TransactionItem[];
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

export type TransactionForm = {
  name: string;
  transactionItems: TransactionItemForm[];
};

export type PaymentStatus = 'paid' | 'unpaid' | 'all';
