// eslint-disable-next-line @nx/enforce-module-boundaries
import { walletList, walletListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiWalletRepository } from '../data';
import { WalletTransferCreateUsecase } from '../domain';
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
  const repository = new ApiWalletRepository(client);
  repository.walletByIdServerParams = walletId;
  const usecase = new WalletTransferCreateUsecase(repository);
  return (
    <WalletTransferCreateScreenView
      walletId={walletId}
      walletTransferCreateUsecase={usecase}
    />
  );
}
