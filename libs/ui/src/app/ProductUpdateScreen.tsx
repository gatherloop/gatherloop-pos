import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryList,
  categoryListQueryKey,
  materialList,
  materialListQueryKey,
  productFindById,
  productFindByIdQueryKey,
} from '../../../api-contract/src';
import {
  OpenAPICategoryRepository,
  OpenAPIMaterialRepository,
  OpenAPIProductRepository,
} from '../data';
import { MaterialListUsecase, ProductUpdateUsecase } from '../domain';
import {
  MaterialListProvider,
  ProductUpdateProvider,
  ProductUpdateScreen as ProductUpdateScreenView,
} from '../presentation';

import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getProductUpdateScreenDehydratedState(
  productId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: productFindByIdQueryKey(productId),
      queryFn: () => productFindById(productId),
    }),
    queryClient.prefetchQuery({
      queryKey: categoryListQueryKey(),
      queryFn: () => categoryList(),
    }),
    queryClient.prefetchQuery({
      queryKey: materialListQueryKey({
        limit: 8,
        skip: 0,
        order: 'desc',
        sortBy: 'created_at',
        query: '',
      }),
      queryFn: () =>
        materialList({
          limit: 8,
          skip: 0,
          order: 'desc',
          sortBy: 'created_at',
          query: '',
        }),
    }),
  ]);

  return dehydrate(queryClient);
}

export type ProductUpdateScreenProps = {
  productId: number;
};

const { useParam } = createParam<ProductUpdateScreenProps>();

export function ProductUpdateScreen({ productId }: ProductUpdateScreenProps) {
  const [productIdParam] = useParam('productId', {
    initial: productId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });

  const client = useQueryClient();
  const productRepository = new OpenAPIProductRepository(client);
  productRepository.productByIdServerParams = productIdParam;
  const categoryRepository = new OpenAPICategoryRepository(client);
  const productUpdateUsecase = new ProductUpdateUsecase(
    productRepository,
    categoryRepository
  );

  const materialRepository = new OpenAPIMaterialRepository(client);
  const materialListUsecase = new MaterialListUsecase(materialRepository);

  return (
    <ProductUpdateProvider usecase={productUpdateUsecase}>
      <MaterialListProvider usecase={materialListUsecase}>
        <ProductUpdateScreenView />
      </MaterialListProvider>
    </ProductUpdateProvider>
  );
}
