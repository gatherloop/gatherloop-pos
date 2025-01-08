import { GetServerSidePropsContext } from 'next';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { categoryList, categoryListQueryKey } from '../../../api-contract/src';
import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import {
  CategoryListUsecase,
  CategoryDeleteUsecase,
  AuthLogoutUsecase,
} from '../domain';
import { CategoryListScreen as CategoryListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getCategoryListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: categoryListQueryKey(),
    queryFn: () =>
      categoryList({ headers: { Cookie: ctx.req.headers.cookie } }),
  });
  return dehydrate(client);
}

export function CategoryListScreen() {
  const client = useQueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const categoryListUsecase = new CategoryListUsecase(categoryRepository);
  const categoryDeleteUsecase = new CategoryDeleteUsecase(categoryRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CategoryListScreenView
      categoryDeleteUsecase={categoryDeleteUsecase}
      categoryListUsecase={categoryListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
