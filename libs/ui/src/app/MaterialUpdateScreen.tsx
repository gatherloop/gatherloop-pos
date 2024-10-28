import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialFindById,
  materialFindByIdQueryKey,
} from '../../../api-contract/src';
import { OpenAPIMaterialRepository } from '../data';
import { MaterialUpdateUsecase } from '../domain';
import {
  MaterialUpdateProvider,
  MaterialUpdateScreen as MaterialUpdateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getMaterialUpdateScreenDehydratedState(
  materialId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: materialFindByIdQueryKey(materialId),
    queryFn: () => materialFindById(materialId),
  });
  return dehydrate(queryClient);
}

export type MaterialUpdateScreenProps = {
  materialId: number;
};

const { useParam } = createParam<MaterialUpdateScreenProps>();

export function MaterialUpdateScreen({
  materialId,
}: MaterialUpdateScreenProps) {
  const [materialIdParam] = useParam('materialId', {
    initial: materialId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const repository = new OpenAPIMaterialRepository(client);
  repository.materialByIdServerParams = materialIdParam;
  const usecase = new MaterialUpdateUsecase(repository);
  return (
    <MaterialUpdateProvider usecase={usecase}>
      <MaterialUpdateScreenView />
    </MaterialUpdateProvider>
  );
}
