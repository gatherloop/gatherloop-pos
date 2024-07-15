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
      queryKey: transactionListQueryKey(),
      queryFn: transactionList,
    });

    return dehydrate(queryClient);
  };
