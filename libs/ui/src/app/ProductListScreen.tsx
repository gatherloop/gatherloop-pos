// eslint-disable-next-line @nx/enforce-module-boundaries
import { productList, productListQueryKey } from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import { ApiAuthRepository, ApiProductRepository } from '../data';
import {
  ProductListUsecase,
  ProductDeleteUsecase,
  AuthLogoutUsecase,
} from '../domain';
import { ProductListScreen as ProductListScreenView } from '../presentation';
import { dehydrate, QueryClient, useQueryClient } from '@tanstack/react-query';

export async function getProductListScreenDehydratedState(
  ctx: GetServerSidePropsContext
) {
  const client = new QueryClient();
  await client.prefetchQuery({
    queryKey: productListQueryKey({
      limit: 8,
      order: 'desc',
      query: '',
      skip: 0,
      sortBy: 'created_at',
    }),
    queryFn: (queryCtx) =>
      productList(
        {
          limit: queryCtx.queryKey[1].limit,
          order: queryCtx.queryKey[1].order,
          query: queryCtx.queryKey[1].query,
          skip: queryCtx.queryKey[1].skip,
          sortBy: queryCtx.queryKey[1].sortBy,
        },
        {
          headers: { Cookie: ctx.req.headers.cookie },
        }
      ),
  });

  return dehydrate(client);
}

export function ProductListScreen() {
  const client = useQueryClient();
  const productRepository = new ApiProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);
  const productDeleteUsecase = new ProductDeleteUsecase(productRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <ProductListScreenView
      productListUsecase={productListUsecase}
      productDeleteUsecase={productDeleteUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
