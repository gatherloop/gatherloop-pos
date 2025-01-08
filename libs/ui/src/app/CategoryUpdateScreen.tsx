// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryFindById,
  categoryFindByIdQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import { AuthLogoutUsecase, CategoryUpdateUsecase } from '../domain';
import { CategoryUpdateScreen as CategoryUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { createParam } from 'solito';

export async function getCategoryUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  categoryId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: categoryFindByIdQueryKey(categoryId),
    queryFn: () =>
      categoryFindById(categoryId, {
        headers: { Cookie: ctx.req.headers.cookie },
      }),
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
  const categoryRepository = new ApiCategoryRepository(client);
  categoryRepository.categoryByIdServerParams = categoryIdParam;
  const categoryUpdateUsecase = new CategoryUpdateUsecase(categoryRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CategoryUpdateScreenView
      categoryUpdateUsecase={categoryUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
