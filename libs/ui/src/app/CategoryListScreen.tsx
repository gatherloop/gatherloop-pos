// eslint-disable-next-line @nx/enforce-module-boundaries
import { categoryList, categoryListQueryKey } from '../../../api-contract/src';
import { OpenAPICategoryRepository } from '../data';
import { CategoryListUsecase, CategoryDeleteUsecase } from '../domain';
import {
  CategoryListScreen as CategoryListScreenView,
  CategoryDeleteProvider,
  CategoryListProvider,
} from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getCategoryListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: categoryListQueryKey(),
    queryFn: () => categoryList(),
  });
  return dehydrate(client);
}

export function CategoryListScreen() {
  const client = useQueryClient();
  const repository = new OpenAPICategoryRepository(client);
  const categoryListUsecase = new CategoryListUsecase(repository);
  const categoryDeleteUsecase = new CategoryDeleteUsecase(repository);
  return (
    <CategoryListProvider usecase={categoryListUsecase}>
      <CategoryDeleteProvider usecase={categoryDeleteUsecase}>
        <CategoryListScreenView />
      </CategoryDeleteProvider>
    </CategoryListProvider>
  );
}
