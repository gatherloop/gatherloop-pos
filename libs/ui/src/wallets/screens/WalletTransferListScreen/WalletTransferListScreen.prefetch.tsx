// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletTransferList,
  walletTransferListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getWalletTransferListScreenDehydratedState = async (
  walletId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: walletTransferListQueryKey(walletId, {
      sortBy: 'created_at',
      order: 'desc',
    }),
    queryFn: (ctx) =>
      walletTransferList(ctx.queryKey[0].params.walletId, {
        sortBy: ctx.queryKey[1].sortBy,
        order: ctx.queryKey[1].order,
      }),
  });

  return dehydrate(queryClient);
};
