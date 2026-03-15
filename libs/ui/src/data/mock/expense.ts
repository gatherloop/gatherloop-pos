import { Expense, ExpenseForm } from '../../domain/entities';
import { ExpenseRepository } from '../../domain/repositories/expense';

const mockWallet = {
  id: 1,
  name: 'Cash',
  balance: 1000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const mockBudget = {
  id: 1,
  name: 'Operating',
  percentage: 30,
  balance: 500,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const initialExpenses: Expense[] = [
  {
    id: 1,
    createdAt: '2024-03-20T00:00:00.000Z',
    wallet: mockWallet,
    budget: mockBudget,
    total: 100000,
    expenseItems: [
      { id: 1, name: 'Item 1', unit: 'pcs', price: 50000, amount: 2 },
    ],
  },
  {
    id: 2,
    createdAt: '2024-03-21T00:00:00.000Z',
    wallet: mockWallet,
    budget: mockBudget,
    total: 100000,
    expenseItems: [
      { id: 2, name: 'Item 1', unit: 'pcs', price: 50000, amount: 2 },
    ],
  },
];

export class MockExpenseRepository implements ExpenseRepository {
  expenses: Expense[] = [...initialExpenses];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getExpenseList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    walletId: number | null;
    budgetId: number | null;
  }): { expenses: Expense[]; totalItem: number } {
    return { expenses: [...this.expenses], totalItem: this.expenses.length };
  }

  async fetchExpenseList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    walletId: number | null;
    budgetId: number | null;
  }): Promise<{ expenses: Expense[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch expenses');
    return Promise.resolve({
      expenses: [...this.expenses],
      totalItem: this.expenses.length,
    });
  }

  async fetchExpenseById(expenseId: number): Promise<Expense> {
    if (this.shouldFail) throw new Error('Failed to fetch expense');
    const expense = this.expenses.find((e) => e.id === expenseId);
    if (!expense) throw new Error('Expense not found');
    return { ...expense };
  }

  async deleteExpenseById(expenseId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete expense');
    this.expenses = this.expenses.filter((e) => e.id !== expenseId);
  }

  async createExpense(_formValues: ExpenseForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create expense');
    this.expenses.push({
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      wallet: mockWallet,
      budget: mockBudget,
      total: 0,
      expenseItems: [],
    });
  }

  async updateExpense(
    _formValues: ExpenseForm,
    expenseId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update expense');
    const idx = this.expenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) throw new Error('Expense not found');
  }

  reset() {
    this.expenses = [...initialExpenses];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
