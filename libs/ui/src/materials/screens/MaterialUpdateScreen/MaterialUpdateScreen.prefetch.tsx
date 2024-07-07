// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialFindById,
  materialFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getMaterialUpdateScreenDehydratedState = async (
  materialId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: materialFindByIdQueryKey(materialId),
    queryFn: (ctx) => materialFindById(ctx.queryKey[0].params.materialId),
  });

  return dehydrate(queryClient);
};
