import { GetServerSidePropsContext } from 'next';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { categoryList, categoryListQueryKey } from '../../../api-contract/src';
import { ApiCategoryRepository } from '../data';
import { CategoryListUsecase, CategoryDeleteUsecase } from '../domain';
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
  const repository = new ApiCategoryRepository(client);
  const categoryListUsecase = new CategoryListUsecase(repository);
  const categoryDeleteUsecase = new CategoryDeleteUsecase(repository);
  return (
    <CategoryListScreenView
      categoryDeleteUsecase={categoryDeleteUsecase}
      categoryListUsecase={categoryListUsecase}
    />
  );
}
