// eslint-disable-next-line @nx/enforce-module-boundaries
import { walletList, walletListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../domain';
import { WalletTransferCreateScreen as WalletTransferCreateScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getWalletTransferCreateScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await Promise.all([
    client.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () =>
        walletList({
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
  ]);

  return dehydrate(client);
}

export type WalletTransferCreateScreenProps = {
  walletId: number;
};

export function WalletTransferCreateScreen({
  walletId,
}: WalletTransferCreateScreenProps) {
  const client = useQueryClient();
  const walletRepository = new ApiWalletRepository(client);
  walletRepository.walletByIdServerParams = walletId;
  const walletTransferCreateUsecase = new WalletTransferCreateUsecase(
    walletRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletTransferCreateScreenView
      walletId={walletId}
      walletTransferCreateUsecase={walletTransferCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
