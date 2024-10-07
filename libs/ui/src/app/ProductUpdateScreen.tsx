// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryList,
  categoryListQueryKey,
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
  ]);

  return dehydrate(queryClient);
}

export type ProductUpdateScreenProps = {
  productId: number;
};

export function ProductUpdateScreen({ productId }: ProductUpdateScreenProps) {
  const client = useQueryClient();
  const productRepository = new OpenAPIProductRepository(client);
  productRepository.productByIdServerParams = productId;
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
