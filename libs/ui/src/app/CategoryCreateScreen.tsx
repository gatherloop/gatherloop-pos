import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../domain';
import { CategoryCreateScreen as CategoryCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function CategoryCreateScreen() {
  const client = useQueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const categoryCreateUsecase = new CategoryCreateUsecase(categoryRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CategoryCreateScreenView
      categoryCreateUsecase={categoryCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
