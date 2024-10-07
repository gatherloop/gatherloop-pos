import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  BudgetList200,
  budgetListQueryKey,
  Budget as ApiBudget,
} from '../../../../api-contract/src';
import { Budget, BudgetRepository } from '../../domain';

export class OpenAPIBudgetRepository implements BudgetRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getBudgetList: BudgetRepository['getBudgetList'] = () => {
    const res = this.client.getQueryState<BudgetList200>(
      budgetListQueryKey()
    )?.data;

    this.client.removeQueries({ queryKey: budgetListQueryKey() });

    return res?.data.map(transformers.budget) ?? [];
  };

  fetchBudgetList: BudgetRepository['fetchBudgetList'] = () => {
    return this.client
      .fetchQuery({
        queryKey: budgetListQueryKey(),
        queryFn: () => budgetList(),
      })
      .then((data) => data.data.map(transformers.budget));
  };
}

const transformers = {
  budget: (budget: ApiBudget): Budget => ({
    id: budget.id,
    createdAt: budget.createdAt,
    name: budget.name,
    balance: budget.balance,
    percentage: budget.percentage,
  }),
};
