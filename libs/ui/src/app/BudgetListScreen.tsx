// eslint-disable-next-line @nx/enforce-module-boundaries
import { budgetList, budgetListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiBudgetRepository } from '../data';
import { AuthLogoutUsecase, BudgetListUsecase } from '../domain';
import { BudgetListScreen as BudgetListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getBudgetListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: budgetListQueryKey(),
    queryFn: () => budgetList({ headers: { Cookie: ctx.req.headers.cookie } }),
  });

  return dehydrate(client);
}

export function BudgetListScreen() {
  const client = useQueryClient();
  const budgetRepository = new ApiBudgetRepository(client);
  const budgetListUsecase = new BudgetListUsecase(budgetRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <BudgetListScreenView
      budgetListUsecase={budgetListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
