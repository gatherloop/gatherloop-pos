// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryList,
  categoryListQueryKey,
  materialList,
  materialListQueryKey,
} from '../../../api-contract/src';
import {
  OpenAPICategoryRepository,
  OpenAPIMaterialRepository,
  OpenAPIProductRepository,
} from '../data';
import { MaterialListUsecase, ProductCreateUsecase } from '../domain';
import { ProductCreateScreen as ProductCreateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getProductCreateScreenDehydratedState(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
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

export function ProductCreateScreen() {
  const client = useQueryClient();
  const productRepository = new OpenAPIProductRepository(client);
  const categoryRepository = new OpenAPICategoryRepository(client);
  const productCreateUsecase = new ProductCreateUsecase(
    productRepository,
    categoryRepository
  );

  const materialRepository = new OpenAPIMaterialRepository(client);
  const materialListUsecase = new MaterialListUsecase(materialRepository);

  return (
    <ProductCreateScreenView
      materialListUsecase={materialListUsecase}
      productCreateUsecase={productCreateUsecase}
    />
  );
}
