// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getTransactionUpdateScreenDehydratedState = async (
  transactionId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: transactionFindByIdQueryKey(transactionId),
    queryFn: (ctx) => transactionFindById(ctx.queryKey[0].params.transactionId),
  });

  return dehydrate(queryClient);
};
