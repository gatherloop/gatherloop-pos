import { Budget } from '../entities';

export interface BudgetRepository {
  getBudgetList: () => Budget[];
  fetchBudgetList: () => Promise<Budget[]>;
}
