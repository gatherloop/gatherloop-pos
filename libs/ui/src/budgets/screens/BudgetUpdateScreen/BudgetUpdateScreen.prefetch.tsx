// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  budgetFindById,
  budgetFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getBudgetUpdateScreenDehydratedState = async (
  budgetId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: budgetFindByIdQueryKey(budgetId),
    queryFn: (ctx) => budgetFindById(ctx.queryKey[0].params.budgetId),
  });

  return dehydrate(queryClient);
};
