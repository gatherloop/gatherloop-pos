// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  budgetListQueryKey,
  walletList,
  walletListQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import {
  ApiAuthRepository,
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
} from '../data';
import { AuthLogoutUsecase, ExpenseCreateUsecase } from '../domain';
import { ExpenseCreateScreen as ExpenseCreateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getExpenseCreateScreenDehydratedState(
  ctx: GetServerSidePropsContext
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () =>
        walletList({ headers: { Cookie: ctx.req.headers.cookie } }),
    }),
    queryClient.prefetchQuery({
      queryKey: budgetListQueryKey(),
      queryFn: () =>
        budgetList({ headers: { Cookie: ctx.req.headers.cookie } }),
    }),
  ]);

  return dehydrate(queryClient);
}

export function ExpenseCreateScreen() {
  const client = useQueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const expenseUsecase = new ExpenseCreateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <ExpenseCreateScreenView
      expenseCreateUsecase={expenseUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
