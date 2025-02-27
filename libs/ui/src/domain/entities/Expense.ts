import { Budget } from './Budget';
import { Wallet } from './Wallet';

export type ExpenseItem = {
  id: number;
  name: string;
  unit: string;
  price: number;
  amount: number;
};

export type Expense = {
  id: number;
  createdAt: string;
  wallet: Wallet;
  budget: Budget;
  total: number;
  expenseItems: ExpenseItem[];
};

export type ExpenseItemForm = {
  id?: number;
  name: string;
  unit: string;
  price: number;
  amount: number;
};

export type ExpenseForm = {
  walletId: number;
  budgetId: number;
  expenseItems: ExpenseItemForm[];
};
