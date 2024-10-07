// eslint-disable-next-line @nx/enforce-module-boundaries
import { materialList, materialListQueryKey } from '../../../api-contract/src';
import { OpenAPIMaterialRepository } from '../data';
import { MaterialListUsecase, MaterialDeleteUsecase } from '../domain';
import {
  MaterialListScreen as MaterialListScreenView,
  MaterialDeleteProvider,
  MaterialListProvider,
} from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getMaterialListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: materialListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (ctx) =>
      materialList({
        limit: ctx.queryKey[1].limit,
        order: ctx.queryKey[1].order,
        query: ctx.queryKey[1].query,
        skip: ctx.queryKey[1].skip,
        sortBy: ctx.queryKey[1].sortBy,
      }),
  });

  return dehydrate(client);
}

export function MaterialListScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIMaterialRepository(client);
  const materialListUsecase = new MaterialListUsecase(repository);
  const materialDeleteUsecase = new MaterialDeleteUsecase(repository);
  return (
    <MaterialListProvider usecase={materialListUsecase}>
      <MaterialDeleteProvider usecase={materialDeleteUsecase}>
        <MaterialListScreenView />
      </MaterialDeleteProvider>
    </MaterialListProvider>
  );
}
