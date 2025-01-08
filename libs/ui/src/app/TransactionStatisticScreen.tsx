// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionStatistics,
  transactionStatisticsQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiTransactionRepository } from '../data';
import { AuthLogoutUsecase, TransactionStatisticListUsecase } from '../domain';
import { TransactionStatisticScreen as TransactionStatisticScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionStatisticScreenDehydratedState(
  ctx: GetServerSidePropsContext
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: transactionStatisticsQueryKey({ groupBy: 'date' }),
    queryFn: () =>
      transactionStatistics(
        { groupBy: 'date' },
        {
          headers: { Cookie: ctx.req.headers.cookie },
        }
      ),
  });
  return dehydrate(queryClient);
}

export function TransactionStatisticScreen() {
  const client = useQueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListusecase = new TransactionStatisticListUsecase(
    transactionRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TransactionStatisticScreenView
      transactionStatisticListUsecase={transactionStatisticListusecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
