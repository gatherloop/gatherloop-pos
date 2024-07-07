// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryFindById,
  categoryFindByIdQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getCategoryUpdateScreenDehydratedState = async (
  categoryId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: categoryFindByIdQueryKey(categoryId),
    queryFn: (ctx) => categoryFindById(ctx.queryKey[0].params.categoryId),
  });

  return dehydrate(queryClient);
};
