import { Budget, BudgetForm } from '../entities';

export interface BudgetRepository {
  fetchBudgetList: () => Promise<Budget[]>;

  fetchBudgetById: (budgetId: number) => Promise<Budget>;

  createBudget: (formValues: BudgetForm) => Promise<void>;

  updateBudget: (formValues: BudgetForm, budgetId: number) => Promise<void>;
}
