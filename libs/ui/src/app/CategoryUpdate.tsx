import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import {
  AuthLogoutUsecase,
  CategoryUpdateParams,
  CategoryUpdateUsecase,
} from '../domain';
import { CategoryUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CategoryUpdateProps = {
  categoryUpdateParams: CategoryUpdateParams;
};

export function CategoryUpdate({
  categoryUpdateParams,
}: CategoryUpdateProps) {
  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const categoryUpdateUsecase = new CategoryUpdateUsecase(
    categoryRepository,
    categoryUpdateParams
  );

  return (
    <CategoryUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      categoryUpdateUsecase={categoryUpdateUsecase}
    />
  );
}
