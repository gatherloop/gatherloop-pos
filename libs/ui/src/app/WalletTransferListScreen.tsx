// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
  walletTransferList,
  walletTransferListQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import {
  AuthLogoutUsecase,
  WalletDetailUsecase,
  WalletTransferListUsecase,
} from '../domain';
import { WalletTransferListScreen as WalletTransferListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getWalletTransferListScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  walletId: number
) {
  const client = new QueryClient();
  await Promise.all([
    client.prefetchQuery({
      queryKey: walletFindByIdQueryKey(walletId),
      queryFn: () =>
        walletFindById(walletId, {
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
    client.prefetchQuery({
      queryKey: walletTransferListQueryKey(walletId, {
        sortBy: 'created_at',
        order: 'desc',
      }),
      queryFn: () =>
        walletTransferList(
          walletId,
          {
            sortBy: 'created_at',
            order: 'desc',
          },
          {
            headers: { Cookie: ctx.req.headers.cookie },
          }
        ),
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
  const walletRepository = new ApiWalletRepository(client);
  walletRepository.walletByIdServerParams = walletId;
  const walletTransferListUsecase = new WalletTransferListUsecase(
    walletRepository
  );
  const walletDetailUsecase = new WalletDetailUsecase(walletRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletTransferListScreenView
      walletId={walletId}
      walletDetailUsecase={walletDetailUsecase}
      walletTransferListUsecase={walletTransferListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
