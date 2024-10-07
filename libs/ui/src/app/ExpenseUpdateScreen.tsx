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
  OpenAPIBudgetRepository,
  OpenAPIExpenseRepository,
  OpenAPIWalletRepository,
} from '../data';
import { ExpenseUpdateUsecase } from '../domain';
import {
  ExpenseUpdateProvider,
  ExpenseUpdateScreen as ExpenseUpdateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getExpenseUpdateScreenDehydratedState(
  expenseId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: expenseFindByIdQueryKey(expenseId),
      queryFn: () => expenseFindById(expenseId),
    }),
    queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () => walletList(),
    }),
    queryClient.prefetchQuery({
      queryKey: budgetListQueryKey(),
      queryFn: () => budgetList(),
    }),
  ]);

  return dehydrate(queryClient);
}

export type ExpenseUpdateScreenProps = {
  expenseId: number;
};

export function ExpenseUpdateScreen({ expenseId }: ExpenseUpdateScreenProps) {
  const client = useQueryClient();
  const expenseRepository = new OpenAPIExpenseRepository(client);
  expenseRepository.expenseByIdServerParams = expenseId;
  const budgetRepository = new OpenAPIBudgetRepository(client);
  const walletRepository = new OpenAPIWalletRepository(client);
  const usecase = new ExpenseUpdateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository
  );
  return (
    <ExpenseUpdateProvider usecase={usecase}>
      <ExpenseUpdateScreenView />
    </ExpenseUpdateProvider>
  );
}
