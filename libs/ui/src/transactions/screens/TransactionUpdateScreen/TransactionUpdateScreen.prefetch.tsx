// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getTransactionUpdateScreenDehydratedState = async (
  transactionId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: transactionFindByIdQueryKey(transactionId),
      queryFn: (ctx) =>
        transactionFindById(ctx.queryKey[0].params.transactionId),
    }),
    queryClient.prefetchQuery({
      queryKey: productListQueryKey({
        sortBy: 'created_at',
        order: 'desc',
        query: '',
        limit: 8,
        skip: 0,
      }),
      queryFn: ({ queryKey }) => {
        return productList({
          sortBy: queryKey[1].sortBy,
          order: queryKey[1].order,
          query: queryKey[1].query,
          limit: queryKey[1].limit,
          skip: queryKey[1].skip,
        });
      },
    }),
  ]);

  return dehydrate(queryClient);
};
