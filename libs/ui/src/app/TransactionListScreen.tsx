// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionList,
  transactionListQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiTransactionRepository, ApiWalletRepository } from '../data';
import {
  TransactionListUsecase,
  TransactionDeleteUsecase,
  TransactionPayUsecase,
} from '../domain';
import { TransactionListScreen as TransactionListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getTransactionListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: transactionListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (queryCtx) =>
      transactionList(
        {
          limit: queryCtx.queryKey[1].limit,
          order: queryCtx.queryKey[1].order,
          query: queryCtx.queryKey[1].query,
          skip: queryCtx.queryKey[1].skip,
          sortBy: queryCtx.queryKey[1].sortBy,
        },
        {
          headers: { Cookie: ctx.req.headers.cookie },
        }
      ),
  });

  return dehydrate(client);
}

export function TransactionListScreen() {
  const client = useQueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const walletRepository = new ApiWalletRepository(client);
  const transactionListUsecase = new TransactionListUsecase(
    transactionRepository
  );
  const transactionDeleteUsecase = new TransactionDeleteUsecase(
    transactionRepository
  );
  const transactionPayUsecase = new TransactionPayUsecase(
    transactionRepository,
    walletRepository
  );
  return (
    <TransactionListScreenView
      transactionDeleteUsecase={transactionDeleteUsecase}
      transactionListUsecase={transactionListUsecase}
      transactionPayUsecase={transactionPayUsecase}
    />
  );
}
