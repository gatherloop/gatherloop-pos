import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import {
  CategoryListUsecase,
  CategoryDeleteUsecase,
  AuthLogoutUsecase,
  CategoryListParams,
} from '../domain';
import { CategoryListScreen as CategoryListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CategoryListScreenProps = {
  categoryListParams: CategoryListParams;
};

export function CategoryListScreen({
  categoryListParams,
}: CategoryListScreenProps) {
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
    <CategoryListScreenView
      categoryDeleteUsecase={categoryDeleteUsecase}
      categoryListUsecase={categoryListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
