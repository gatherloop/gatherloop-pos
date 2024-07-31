// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialList,
  materialListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getMaterialListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: materialListQueryKey(),
      queryFn: () => materialList({ sortBy: 'created_at', order: 'desc' }),
    });

    return dehydrate(queryClient);
  };
