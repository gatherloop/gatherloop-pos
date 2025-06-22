import { ApiAuthRepository, ApiCategoryRepository } from '../data';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../domain';
import { CategoryCreateScreen as CategoryCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function CategoryCreateScreen() {
  const client = new QueryClient();
  const categoryRepository = new ApiCategoryRepository(client);
  const authRepository = new ApiAuthRepository();

  const categoryCreateUsecase = new CategoryCreateUsecase(categoryRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CategoryCreateScreenView
      categoryCreateUsecase={categoryCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
