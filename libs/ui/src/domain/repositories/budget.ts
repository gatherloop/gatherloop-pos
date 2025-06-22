import { Budget } from '../entities';

export interface BudgetRepository {
  fetchBudgetList: () => Promise<Budget[]>;
}
