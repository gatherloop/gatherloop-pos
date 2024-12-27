import { Product } from './Product';
import { Wallet } from './Wallet';

type TransactionItem = {
  id: number;
  product: Product;
  amount: number;
  price: number;
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
  product: Product;
  amount: number;
};

export type TransactionForm = {
  name: string;
  transactionItems: TransactionItemForm[];
};

export type PaymentStatus = 'paid' | 'unpaid' | 'all';
