import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetCreate,
  budgetFindById,
  budgetFindByIdQueryKey,
  budgetList,
  budgetListQueryKey,
  budgetUpdateById,
} from '../../../../api-contract/src';
import { Budget, BudgetRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiBudget, toBudget } from './budget.transformer';

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

  fetchBudgetById = (budgetId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: budgetFindByIdQueryKey(budgetId),
        queryFn: () => budgetFindById(budgetId, options),
      })
      .then(({ data }) => toBudget(data));
  };

  createBudget: BudgetRepository['createBudget'] = (formValues) => {
    return budgetCreate(toApiBudget(formValues)).then();
  };

  updateBudget: BudgetRepository['updateBudget'] = (formValues, budgetId) => {
    return budgetUpdateById(budgetId, toApiBudget(formValues)).then();
  };
}
