import { Expense, ExpenseForm } from '../entities';

export interface ExpenseRepository {
  getExpenseList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    walletId: number | null;
    budgetId: number | null;
  }) => { expenses: Expense[]; totalItem: number };

  fetchExpenseList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    walletId: number | null;
    budgetId: number | null;
  }) => Promise<{ expenses: Expense[]; totalItem: number }>;

  fetchExpenseById: (expenseId: number) => Promise<Expense>;

  deleteExpenseById: (expenseId: number) => Promise<void>;

  createExpense: (formValues: ExpenseForm) => Promise<void>;

  updateExpense: (formValues: ExpenseForm, expenseId: number) => Promise<void>;
}
