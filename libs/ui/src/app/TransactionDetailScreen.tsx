// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
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
  ctx: GetServerSidePropsContext,
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionFindByIdQueryKey(transactionId),
    queryFn: () =>
      transactionFindById(transactionId, {
        headers: { Cookie: ctx.req.headers.cookie },
      }),
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
