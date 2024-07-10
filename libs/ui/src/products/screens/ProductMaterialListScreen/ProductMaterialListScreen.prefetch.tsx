// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productMaterialList,
  productMaterialListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getProductMaterialListScreenDehydratedState = async (
  productId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: productMaterialListQueryKey(productId),
    queryFn: (ctx) => productMaterialList(ctx.queryKey[0].params.productId),
  });

  return dehydrate(queryClient);
};
