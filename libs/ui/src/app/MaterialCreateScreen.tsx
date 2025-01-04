import { ApiMaterialRepository } from '../data';
import { MaterialCreateUsecase } from '../domain';
import { MaterialCreateScreen as MaterialCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function MaterialCreateScreen() {
  const client = useQueryClient();
  const repository = new ApiMaterialRepository(client);
  const usecase = new MaterialCreateUsecase(repository);
  return <MaterialCreateScreenView materialCreateUsecase={usecase} />;
}
