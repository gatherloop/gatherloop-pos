import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialFindById,
  materialFindByIdQueryKey,
} from '../../../api-contract/src';
import { ApiAuthRepository, ApiMaterialRepository } from '../data';
import { AuthLogoutUsecase, MaterialUpdateUsecase } from '../domain';
import { MaterialUpdateScreen as MaterialUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';

export async function getMaterialUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  materialId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: materialFindByIdQueryKey(materialId),
    queryFn: () =>
      materialFindById(materialId, {
        headers: { Cookie: ctx.req.headers.cookie },
      }),
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
  const materialRepository = new ApiMaterialRepository(client);
  materialRepository.materialByIdServerParams = materialIdParam;
  const materialUpdateUsecase = new MaterialUpdateUsecase(materialRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <MaterialUpdateScreenView
      materialUpdateUsecase={materialUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
