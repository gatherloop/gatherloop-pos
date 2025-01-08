// eslint-disable-next-line @nx/enforce-module-boundaries
import { walletList, walletListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiWalletRepository } from '../data';
import { AuthLogoutUsecase, WalletListUsecase } from '../domain';
import { WalletListScreen as WalletListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getWalletListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: walletListQueryKey(),
    queryFn: () =>
      walletList({
        headers: { Cookie: ctx.req.headers.cookie },
      }),
  });

  return dehydrate(client);
}

export function WalletListScreen() {
  const client = useQueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const walletListUsecase = new WalletListUsecase(walletRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <WalletListScreenView
      walletListUsecase={walletListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
