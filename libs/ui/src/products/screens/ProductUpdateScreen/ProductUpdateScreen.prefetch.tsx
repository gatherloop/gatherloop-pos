// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productFindById,
  productFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getProductUpdateScreenDehydratedState = async (
  productId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: productFindByIdQueryKey(productId),
    queryFn: (ctx) => productFindById(ctx.queryKey[0].params.productId),
  });

  return dehydrate(queryClient);
};
