import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  budgetListQueryKey,
  expenseFindById,
  expenseFindByIdQueryKey,
  walletList,
  walletListQueryKey,
} from '../../../api-contract/src';
import {
  ApiAuthRepository,
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiWalletRepository,
} from '../data';
import { AuthLogoutUsecase, ExpenseUpdateUsecase } from '../domain';
import { ExpenseUpdateScreen as ExpenseUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';

export async function getExpenseUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  expenseId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: expenseFindByIdQueryKey(expenseId),
      queryFn: () =>
        expenseFindById(expenseId, {
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
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

export type ExpenseUpdateScreenProps = {
  expenseId: number;
};

const { useParam } = createParam<ExpenseUpdateScreenProps>();

export function ExpenseUpdateScreen({ expenseId }: ExpenseUpdateScreenProps) {
  const [expenseIdParam] = useParam('expenseId', {
    initial: expenseId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const expenseRepository = new ApiExpenseRepository(client);
  expenseRepository.expenseByIdServerParams = expenseIdParam;
  const budgetRepository = new ApiBudgetRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const expenseUpdateUsecase = new ExpenseUpdateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <ExpenseUpdateScreenView
      expenseUpdateUsecase={expenseUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
