// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
  walletTransferList,
  walletTransferListQueryKey,
} from '../../../api-contract/src';
import { OpenAPIWalletRepository } from '../data';
import { WalletDetailUsecase, WalletTransferListUsecase } from '../domain';
import {
  WalletDetailProvider,
  WalletTransferListProvider,
  WalletTransferListScreen as WalletTransferListScreenView,
} from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getWalletTransferListScreenDehydratedState(
  walletId: number
) {
  const client = new QueryClient();
  await Promise.all([
    client.prefetchQuery({
      queryKey: walletFindByIdQueryKey(walletId),
      queryFn: () => walletFindById(walletId),
    }),
    client.prefetchQuery({
      queryKey: walletTransferListQueryKey(walletId, {
        sortBy: 'created_at',
        order: 'desc',
      }),
      queryFn: () =>
        walletTransferList(walletId, {
          sortBy: 'created_at',
          order: 'desc',
        }),
    }),
  ]);

  return dehydrate(client);
}

export type WalletTransferListScreenProps = {
  walletId: number;
};

export function WalletTransferListScreen({
  walletId,
}: WalletTransferListScreenProps) {
  const client = useQueryClient();
  const repository = new OpenAPIWalletRepository(client);
  repository.walletByIdServerParams = walletId;
  const walletTransferListUsecase = new WalletTransferListUsecase(repository);
  const walletDetailUsecase = new WalletDetailUsecase(repository);
  return (
    <WalletTransferListProvider usecase={walletTransferListUsecase}>
      <WalletDetailProvider usecase={walletDetailUsecase}>
        <WalletTransferListScreenView walletId={walletId} />
      </WalletDetailProvider>
    </WalletTransferListProvider>
  );
}
