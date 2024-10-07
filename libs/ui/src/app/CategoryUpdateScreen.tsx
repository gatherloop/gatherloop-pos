// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryFindById,
  categoryFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPICategoryRepository } from '../data';
import { CategoryUpdateUsecase } from '../domain';
import {
  CategoryUpdateProvider,
  CategoryUpdateScreen as CategoryUpdateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getCategoryUpdateScreenDehydratedState(
  categoryId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: categoryFindByIdQueryKey(categoryId),
    queryFn: () => categoryFindById(categoryId),
  });
  return dehydrate(queryClient);
}

export type CategoryUpdateScreenProps = {
  categoryId: number;
};

export function CategoryUpdateScreen({
  categoryId,
}: CategoryUpdateScreenProps) {
  const client = useQueryClient();
  const repository = new OpenAPICategoryRepository(client);
  repository.categoryByIdServerParams = categoryId;
  const usecase = new CategoryUpdateUsecase(repository);
  return (
    <CategoryUpdateProvider usecase={usecase}>
      <CategoryUpdateScreenView />
    </CategoryUpdateProvider>
  );
}
