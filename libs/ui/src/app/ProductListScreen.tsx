// eslint-disable-next-line @nx/enforce-module-boundaries
import { productList, productListQueryKey } from '../../../api-contract/src';
import { OpenAPIProductRepository } from '../data';
import { ProductListUsecase, ProductDeleteUsecase } from '../domain';
import { ProductListScreen as ProductListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getProductListScreenDehydratedState() {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: productListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (ctx) =>
      productList({
        limit: ctx.queryKey[1].limit,
        order: ctx.queryKey[1].order,
        query: ctx.queryKey[1].query,
        skip: ctx.queryKey[1].skip,
        sortBy: ctx.queryKey[1].sortBy,
      }),
  });

  return dehydrate(client);
}

export function ProductListScreen() {
  const client = useQueryClient();
  const repository = new OpenAPIProductRepository(client);
  const productListUsecase = new ProductListUsecase(repository);
  const productDeleteUsecase = new ProductDeleteUsecase(repository);
  return (
    <ProductListScreenView
      productListUsecase={productListUsecase}
      productDeleteUsecase={productDeleteUsecase}
    />
  );
}
