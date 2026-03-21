// eslint-disable-next-line @nx/enforce-module-boundaries
import { Budget as ApiBudget } from '../../../../api-contract/src';
import { Budget } from '../../domain';

export function toBudget(budget: ApiBudget): Budget {
  return {
    id: budget.id,
    createdAt: budget.createdAt,
    name: budget.name,
    balance: budget.balance,
    percentage: budget.percentage,
  };
}
