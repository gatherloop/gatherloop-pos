import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import {
  CategoryListUsecase,
  CategoryDeleteUsecase,
  AuthLogoutUsecase,
  CategoryListParams,
} from '../domain';
import { CategoryListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CategoryListProps = {
  categoryListParams: CategoryListParams;
};

export function CategoryList({ categoryListParams }: CategoryListProps) {
  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const categoryDeleteUsecase = new CategoryDeleteUsecase(categoryRepository);
  const categoryListUsecase = new CategoryListUsecase(
    categoryRepository,
    categoryListParams
  );

  return (
    <CategoryListHandler
      authLogoutUsecase={authLogoutUsecase}
      categoryListUsecase={categoryListUsecase}
      categoryDeleteUsecase={categoryDeleteUsecase}
    />
  );
}
