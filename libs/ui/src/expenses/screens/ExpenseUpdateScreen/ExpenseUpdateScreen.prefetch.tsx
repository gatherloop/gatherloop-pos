// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  expenseFindById,
  expenseFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getExpenseUpdateScreenDehydratedState = async (
  expenseId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: expenseFindByIdQueryKey(expenseId),
    queryFn: (ctx) => expenseFindById(ctx.queryKey[0].params.expenseId),
  });

  return dehydrate(queryClient);
};
