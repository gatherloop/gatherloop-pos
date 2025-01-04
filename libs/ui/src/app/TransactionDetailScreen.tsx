// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { ApiTransactionRepository } from '../data';
import { TransactionDetailUsecase } from '../domain';
import { TransactionDetailScreen as TransactionDetailScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionDetailScreenDehydratedState(
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionFindByIdQueryKey(transactionId),
    queryFn: () => transactionFindById(transactionId),
  });
  return dehydrate(queryClient);
}

export type TransactionDetailScreenProps = {
  transactionId: number;
};

export function TransactionDetailScreen({
  transactionId,
}: TransactionDetailScreenProps) {
  const client = useQueryClient();
  const repository = new ApiTransactionRepository(client);
  repository.transactionByIdServerParams = transactionId;
  const usecase = new TransactionDetailUsecase(repository);
  return <TransactionDetailScreenView transactionDetailUsecase={usecase} />;
}
