import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  budgetListQueryKey,
  Budget as ApiBudget,
} from '../../../../api-contract/src';
import { Budget, BudgetRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiBudgetRepository implements BudgetRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchBudgetList = (options?: Partial<RequestConfig>): Promise<Budget[]> => {
    return this.client
      .fetchQuery({
        queryKey: budgetListQueryKey(),
        queryFn: () => budgetList(options),
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
