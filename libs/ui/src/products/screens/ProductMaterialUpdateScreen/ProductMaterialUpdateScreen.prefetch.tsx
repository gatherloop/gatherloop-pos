// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productMaterialFindById,
  productMaterialFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getProductMaterialUpdateScreenDehydratedState = async (
  productId: number,
  productMaterialId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: productMaterialFindByIdQueryKey(productId, productMaterialId),
    queryFn: (ctx) =>
      productMaterialFindById(
        ctx.queryKey[0].params.productId,
        ctx.queryKey[0].params.productMaterialId
      ),
  });

  return dehydrate(queryClient);
};
