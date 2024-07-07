// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryList,
  categoryListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getCategoryListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: categoryListQueryKey(),
      queryFn: categoryList,
    });

    return dehydrate(queryClient);
  };
