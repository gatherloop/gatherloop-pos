// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetList,
  budgetListQueryKey,
  walletList,
  walletListQueryKey,
} from '../../../api-contract/src';
import {
  OpenAPIBudgetRepository,
  OpenAPIExpenseRepository,
  OpenAPIWalletRepository,
} from '../data';
import { ExpenseCreateUsecase } from '../domain';
import {
  ExpenseCreateProvider,
  ExpenseCreateScreen as ExpenseCreateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getExpenseCreateScreenDehydratedState(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
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

export function ExpenseCreateScreen() {
  const client = useQueryClient();
  const expenseRepository = new OpenAPIExpenseRepository(client);
  const budgetRepository = new OpenAPIBudgetRepository(client);
  const walletRepository = new OpenAPIWalletRepository(client);
  const usecase = new ExpenseCreateUsecase(
    expenseRepository,
    budgetRepository,
    walletRepository
  );
  return (
    <ExpenseCreateProvider usecase={usecase}>
      <ExpenseCreateScreenView />
    </ExpenseCreateProvider>
  );
}
