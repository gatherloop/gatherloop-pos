import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import {
  AuthLogoutUsecase,
  CategoryUpdateParams,
  CategoryUpdateUsecase,
} from '../domain';
import { CategoryUpdateScreen as CategoryUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CategoryUpdateScreenProps = {
  categoryUpdateParams: CategoryUpdateParams;
};

export function CategoryUpdateScreen({
  categoryUpdateParams,
}: CategoryUpdateScreenProps) {
  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const categoryUpdateUsecase = new CategoryUpdateUsecase(
    categoryRepository,
    categoryUpdateParams
  );

  return (
    <CategoryUpdateScreenView
      categoryUpdateUsecase={categoryUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
