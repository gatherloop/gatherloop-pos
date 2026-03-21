import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  budgetListQueryKey,
} from '../../../../api-contract/src';
import { Budget, BudgetRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toBudget } from './budget.transformer';

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
      .then((data) => data.data.map(toBudget));
  };
}
