import { z } from 'zod';
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

// { raw: true } is required at the call site: this schema does not describe
// expenseItems[].id, so existing items keep their id on submit instead of
// having it stripped by the parser.
export const expenseFormSchema = z.object({
  walletId: z.number(),
  budgetId: z.number(),
  expenseItems: z
    .array(
      z.lazy(() =>
        z.object({
          name: z.string().min(1),
          unit: z.string().min(1),
          price: z.number().min(1),
          amount: z.number().min(1),
        })
      )
    )
    .min(1),
});
