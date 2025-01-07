// eslint-disable-next-line @nx/enforce-module-boundaries
import { walletList, walletListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiWalletRepository } from '../data';
import { WalletListUsecase } from '../domain';
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
  const repository = new ApiWalletRepository(client);
  const walletListUsecase = new WalletListUsecase(repository);
  return <WalletListScreenView walletListUsecase={walletListUsecase} />;
}
