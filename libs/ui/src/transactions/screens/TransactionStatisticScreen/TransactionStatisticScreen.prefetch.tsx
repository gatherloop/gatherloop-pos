// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionStatistics,
  transactionStatisticsQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getTransactionStatisticScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: transactionStatisticsQueryKey({ groupBy: 'date' }),
      queryFn: () => transactionStatistics({ groupBy: 'date' }),
    });

    return dehydrate(queryClient);
  };
