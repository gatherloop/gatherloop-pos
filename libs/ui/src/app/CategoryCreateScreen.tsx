import { OpenAPICategoryRepository } from '../data';
import { CategoryCreateUsecase } from '../domain';
import { CategoryCreateScreen as CategoryCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function CategoryCreateScreen() {
  const client = useQueryClient();
  const repository = new OpenAPICategoryRepository(client);
  const usecase = new CategoryCreateUsecase(repository);
  return <CategoryCreateScreenView categoryCreateUsecase={usecase} />;
}
