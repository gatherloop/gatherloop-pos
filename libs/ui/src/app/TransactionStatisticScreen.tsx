// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionStatistics,
  transactionStatisticsQueryKey,
} from '../../../api-contract/src';
import { OpenAPITransactionRepository } from '../data';
import { TransactionStatisticListUsecase } from '../domain';
import {
  TransactionStatisticListProvider,
  TransactionStatisticScreen as TransactionStatisticScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionStatisticScreenDehydratedState(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionStatisticsQueryKey({ groupBy: 'date' }),
    queryFn: () => transactionStatistics({ groupBy: 'date' }),
  });
  return dehydrate(queryClient);
}

export function TransactionStatisticScreen() {
  const client = useQueryClient();
  const repository = new OpenAPITransactionRepository(client);
  const usecase = new TransactionStatisticListUsecase(repository);
  return (
    <TransactionStatisticListProvider usecase={usecase}>
      <TransactionStatisticScreenView />
    </TransactionStatisticListProvider>
  );
}
