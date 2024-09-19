// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionList,
  transactionListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getTransactionListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: transactionListQueryKey({
        sortBy: 'created_at',
        order: 'desc',
        query: '',
        limit: 10,
        skip: 0,
      }),
      queryFn: ({ queryKey }) => {
        return transactionList({
          sortBy: queryKey[1].sortBy,
          order: queryKey[1].order,
          query: queryKey[1].query,
          limit: queryKey[1].limit,
          skip: queryKey[1].skip,
        });
      },
    });

    return dehydrate(queryClient);
  };
