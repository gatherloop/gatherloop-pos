// eslint-disable-next-line @nx/enforce-module-boundaries
import { expenseList, expenseListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiExpenseRepository } from '../data';
import {
  ExpenseListUsecase,
  ExpenseDeleteUsecase,
  AuthLogoutUsecase,
} from '../domain';
import { ExpenseListScreen as ExpenseListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getExpenseListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: expenseListQueryKey({
      sortBy: 'created_at',
      order: 'desc',
    }),
    queryFn: () =>
      expenseList(
        {
          sortBy: 'created_at',
          order: 'desc',
        },
        { headers: { Cookie: ctx.req.headers.cookie } }
      ),
  });
  return dehydrate(client);
}

export function ExpenseListScreen() {
  const client = useQueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const expenseListUsecase = new ExpenseListUsecase(expenseRepository);
  const expenseDeleteUsecase = new ExpenseDeleteUsecase(expenseRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <ExpenseListScreenView
      expenseDeleteUsecase={expenseDeleteUsecase}
      expenseListUsecase={expenseListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
