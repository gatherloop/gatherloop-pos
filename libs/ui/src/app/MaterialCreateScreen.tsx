import { OpenAPIMaterialRepository } from '../data';
import { MaterialCreateUsecase } from '../domain';
import {
  MaterialCreateProvider,
  MaterialCreateScreen as MaterialCreateScreenView,
} from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function MaterialCreateScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIMaterialRepository(client);
  const usecase = new MaterialCreateUsecase(repository);
  return (
    <MaterialCreateProvider usecase={usecase}>
      <MaterialCreateScreenView />
    </MaterialCreateProvider>
  );
}
