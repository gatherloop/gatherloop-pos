import { Product } from './Product';
import { Wallet } from './Wallet';

type TransactionItem = {
  id: number;
  product: Product;
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
  wallet?: Wallet;
  paidAt?: string;
};

type TransactionItemForm = {
  id?: number;
  product: Product;
  amount: number;
  discountAmount: number;
};

export type TransactionForm = {
  name: string;
  transactionItems: TransactionItemForm[];
};

export type PaymentStatus = 'paid' | 'unpaid' | 'all';
