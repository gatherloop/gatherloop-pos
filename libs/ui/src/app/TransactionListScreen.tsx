// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  transactionList,
  transactionListQueryKey,
} from '../../../api-contract/src';
import { OpenAPITransactionRepository, OpenAPIWalletRepository } from '../data';
import {
  TransactionListUsecase,
  TransactionDeleteUsecase,
  TransactionPayUsecase,
} from '../domain';
import {
  TransactionListScreen as TransactionListScreenView,
  TransactionDeleteProvider,
  TransactionListProvider,
  TransactionPayProvider,
} from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getTransactionListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: transactionListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (ctx) =>
      transactionList({
        limit: ctx.queryKey[1].limit,
        order: ctx.queryKey[1].order,
        query: ctx.queryKey[1].query,
        skip: ctx.queryKey[1].skip,
        sortBy: ctx.queryKey[1].sortBy,
      }),
  });

  return dehydrate(client);
}

export function TransactionListScreen() {
  const client = useQueryClient();
  const transactionRepository = new OpenAPITransactionRepository(client);
  const walletRepository = new OpenAPIWalletRepository(client);
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
    <TransactionListProvider usecase={transactionListUsecase}>
      <TransactionDeleteProvider usecase={transactionDeleteUsecase}>
        <TransactionPayProvider usecase={transactionPayUsecase}>
          <TransactionListScreenView />
        </TransactionPayProvider>
      </TransactionDeleteProvider>
    </TransactionListProvider>
  );
}
