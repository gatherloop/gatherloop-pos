import { Expense, ExpenseForm } from '../entities';

export interface ExpenseRepository {
  fetchExpenseList: () => Promise<Expense[]>;

  fetchExpenseById: (expenseId: number) => Promise<Expense>;

  deleteExpenseById: (expenseId: number) => Promise<void>;

  createExpense: (formValues: ExpenseForm) => Promise<void>;

  updateExpense: (formValues: ExpenseForm, expenseId: number) => Promise<void>;
}
