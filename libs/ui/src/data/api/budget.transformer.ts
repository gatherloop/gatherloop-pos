// eslint-disable-next-line @nx/enforce-module-boundaries
import { Budget as ApiBudget } from '../../../../api-contract/src';
import { Budget, BudgetForm } from '../../domain';

export function toBudget(budget: ApiBudget): Budget {
  return {
    id: budget.id,
    createdAt: budget.createdAt,
    name: budget.name,
    percentage: budget.percentage,
  };
}

export function toApiBudget(form: BudgetForm) {
  return {
    name: form.name,
    percentage: form.percentage,
  };
}
