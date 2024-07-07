// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletFindById,
  walletFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getWalletUpdateScreenDehydratedState = async (
  walletId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: walletFindByIdQueryKey(walletId),
    queryFn: (ctx) => walletFindById(ctx.queryKey[0].params.walletId),
  });

  return dehydrate(queryClient);
};
