import { Expense, ExpenseForm } from '../entities';

export interface ExpenseRepository {
  getExpenseByIdServerParams: () => number | null;

  getExpenseList: () => Expense[];

  getExpenseById: (expenseId: number) => Expense | null;

  fetchExpenseList: () => Promise<Expense[]>;

  fetchExpenseById: (expenseId: number) => Promise<Expense>;

  deleteExpenseById: (expenseId: number) => Promise<void>;

  createExpense: (formValues: ExpenseForm) => Promise<void>;

  updateExpense: (formValues: ExpenseForm, expenseId: number) => Promise<void>;
}
