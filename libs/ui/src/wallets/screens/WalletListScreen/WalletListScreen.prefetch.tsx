// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  walletList,
  walletListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getWalletListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: walletList,
    });

    return dehydrate(queryClient);
  };
