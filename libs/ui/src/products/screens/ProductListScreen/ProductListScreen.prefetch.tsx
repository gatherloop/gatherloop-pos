// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getProductListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: productListQueryKey(),
      queryFn: productList,
    });

    return dehydrate(queryClient);
  };
