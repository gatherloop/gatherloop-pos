import { Budget } from '../../domain/entities';
import { BudgetRepository } from '../../domain/repositories/budget';

export class MockBudgetRepository implements BudgetRepository {
  budgets: Budget[] = [
    {
      id: 1,
      name: 'Mock Budget 1',
      percentage: 30,
      balance: 500,
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Mock Budget 2',
      percentage: 20,
      balance: 300,
      createdAt: '2024-03-21T00:00:00.000Z',
    },
  ];

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchBudgetList(): Promise<Budget[]> {
    if (this.shouldFail) throw new Error('Failed to fetch budgets');
    return [...this.budgets];
  }

  reset() {
    this.budgets = [
      {
        id: 1,
        name: 'Mock Budget 1',
        percentage: 30,
        balance: 500,
        createdAt: '2024-03-20T00:00:00.000Z',
      },
      {
        id: 2,
        name: 'Mock Budget 2',
        percentage: 20,
        balance: 300,
        createdAt: '2024-03-21T00:00:00.000Z',
      },
    ];
    this.shouldFail = false;
  }
}
