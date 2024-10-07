// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPITransactionRepository } from '../data';
import { TransactionUpdateUsecase } from '../domain';
import {
  TransactionUpdateProvider,
  TransactionUpdateScreen as TransactionUpdateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionUpdateScreenDehydratedState(
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionFindByIdQueryKey(transactionId),
    queryFn: () => transactionFindById(transactionId),
  });
  return dehydrate(queryClient);
}

export type TransactionUpdateScreenProps = {
  transactionId: number;
};

export function TransactionUpdateScreen({
  transactionId,
}: TransactionUpdateScreenProps) {
  const client = useQueryClient();
  const repository = new OpenAPITransactionRepository(client);
  repository.transactionByIdServerParams = transactionId;
  const usecase = new TransactionUpdateUsecase(repository);
  return (
    <TransactionUpdateProvider usecase={usecase}>
      <TransactionUpdateScreenView />
    </TransactionUpdateProvider>
  );
}
