// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiTransactionRepository } from '../data';
import { AuthLogoutUsecase, TransactionDetailUsecase } from '../domain';
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
  const transactionRepository = new ApiTransactionRepository(client);
  transactionRepository.transactionByIdServerParams = transactionId;
  const transactionDetailUsecase = new TransactionDetailUsecase(
    transactionRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TransactionDetailScreenView
      transactionDetailUsecase={transactionDetailUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
