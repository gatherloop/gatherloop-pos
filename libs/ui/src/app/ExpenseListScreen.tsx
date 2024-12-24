// eslint-disable-next-line @nx/enforce-module-boundaries
import { expenseList, expenseListQueryKey } from '../../../api-contract/src';
import { OpenAPIExpenseRepository } from '../data';
import { ExpenseListUsecase, ExpenseDeleteUsecase } from '../domain';
import { ExpenseListScreen as ExpenseListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getExpenseListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: expenseListQueryKey({
      sortBy: 'created_at',
      order: 'desc',
    }),
    queryFn: () =>
      expenseList({
        sortBy: 'created_at',
        order: 'desc',
      }),
  });
  return dehydrate(client);
}

export function ExpenseListScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIExpenseRepository(client);
  const expenseListUsecase = new ExpenseListUsecase(repository);
  const expenseDeleteUsecase = new ExpenseDeleteUsecase(repository);
  return (
    <ExpenseListScreenView
      expenseDeleteUsecase={expenseDeleteUsecase}
      expenseListUsecase={expenseListUsecase}
    />
  );
}
