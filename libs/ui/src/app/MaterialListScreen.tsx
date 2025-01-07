// eslint-disable-next-line @nx/enforce-module-boundaries
import { materialList, materialListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiMaterialRepository } from '../data';
import { MaterialListUsecase, MaterialDeleteUsecase } from '../domain';
import { MaterialListScreen as MaterialListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getMaterialListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: materialListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (queryCtx) =>
      materialList(
        {
          limit: queryCtx.queryKey[1].limit,
          order: queryCtx.queryKey[1].order,
          query: queryCtx.queryKey[1].query,
          skip: queryCtx.queryKey[1].skip,
          sortBy: queryCtx.queryKey[1].sortBy,
        },
        { headers: { Cookie: ctx.req.headers.cookie } }
      ),
  });

  return dehydrate(client);
}

export function MaterialListScreen() {
  const client = useQueryClient();
  const repository = new ApiMaterialRepository(client);
  const materialListUsecase = new MaterialListUsecase(repository);
  const materialDeleteUsecase = new MaterialDeleteUsecase(repository);
  return (
    <MaterialListScreenView
      materialDeleteUsecase={materialDeleteUsecase}
      materialListUsecase={materialListUsecase}
    />
  );
}
