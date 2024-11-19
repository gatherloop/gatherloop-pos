// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPITransactionRepository } from '../data';
import { TransactionPrintUsecase } from '../domain';
import {
  TransactionPrintProvider,
  TransactionPrintScreen as TransactionPrintScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionPrintScreenDehydratedState(
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionFindByIdQueryKey(transactionId),
    queryFn: () => transactionFindById(transactionId),
  });
  return dehydrate(queryClient);
}

export type TransactionPrintScreenProps = {
  transactionId: number;
};

export function TransactionPrintScreen({
  transactionId,
}: TransactionPrintScreenProps) {
  const client = useQueryClient();
  const repository = new OpenAPITransactionRepository(client);
  repository.transactionByIdServerParams = transactionId;
  const usecase = new TransactionPrintUsecase(repository);
  return (
    <TransactionPrintProvider usecase={usecase}>
      <TransactionPrintScreenView />
    </TransactionPrintProvider>
  );
}
