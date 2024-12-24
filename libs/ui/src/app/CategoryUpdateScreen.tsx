// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryFindById,
  categoryFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPICategoryRepository } from '../data';
import { CategoryUpdateUsecase } from '../domain';
import { CategoryUpdateScreen as CategoryUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { createParam } from 'solito';

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

const { useParam } = createParam<CategoryUpdateScreenProps>();

export function CategoryUpdateScreen({
  categoryId,
}: CategoryUpdateScreenProps) {
  const [categoryIdParam] = useParam('categoryId', {
    initial: categoryId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const repository = new OpenAPICategoryRepository(client);
  repository.categoryByIdServerParams = categoryIdParam;
  const usecase = new CategoryUpdateUsecase(repository);
  return <CategoryUpdateScreenView categoryUpdateUsecase={usecase} />;
}
