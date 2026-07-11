import { Budget, BudgetForm } from '../../domain/entities';
import { BudgetRepository } from '../../domain/repositories/budget';

const initialBudgets: Budget[] = [
  {
    id: 1,
    name: 'Mock Budget 1',
    percentage: 30,
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Mock Budget 2',
    percentage: 20,
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockBudgetRepository implements BudgetRepository {
  budgets: Budget[] = [...initialBudgets];

  private nextBudgetId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchBudgetList(): Promise<Budget[]> {
    if (this.shouldFail) throw new Error('Failed to fetch budgets');
    return [...this.budgets];
  }

  async fetchBudgetById(budgetId: number): Promise<Budget> {
    if (this.shouldFail) throw new Error('Failed to fetch budget');
    const budget = this.budgets.find((b) => b.id === budgetId);
    if (!budget) throw new Error('Budget not found');
    return { ...budget };
  }

  async createBudget(formValues: BudgetForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create budget');
    this.budgets.push({
      id: this.nextBudgetId++,
      name: formValues.name,
      percentage: formValues.percentage,
      createdAt: new Date().toISOString(),
    });
  }

  async updateBudget(formValues: BudgetForm, budgetId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update budget');
    const idx = this.budgets.findIndex((b) => b.id === budgetId);
    if (idx === -1) throw new Error('Budget not found');
    this.budgets[idx] = {
      ...this.budgets[idx],
      name: formValues.name,
      percentage: formValues.percentage,
    };
  }

  reset() {
    this.budgets = [...initialBudgets];
    this.nextBudgetId = 3;
    this.shouldFail = false;
  }
}
