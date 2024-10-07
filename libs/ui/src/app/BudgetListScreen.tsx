// eslint-disable-next-line @nx/enforce-module-boundaries
import { budgetList, budgetListQueryKey } from '../../../api-contract/src';
import { OpenAPIBudgetRepository } from '../data';
import { BudgetListUsecase } from '../domain';
import {
  BudgetListScreen as BudgetListScreenView,
  BudgetListProvider,
} from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getBudgetListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: budgetListQueryKey(),
    queryFn: () => budgetList(),
  });

  return dehydrate(client);
}

export function BudgetListScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIBudgetRepository(client);
  const budgetListUsecase = new BudgetListUsecase(repository);
  return (
    <BudgetListProvider usecase={budgetListUsecase}>
      <BudgetListScreenView />
    </BudgetListProvider>
  );
}
