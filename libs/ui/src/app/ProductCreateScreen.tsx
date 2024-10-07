// eslint-disable-next-line @nx/enforce-module-boundaries
import { categoryList, categoryListQueryKey } from '../../../api-contract/src';
import {
  OpenAPICategoryRepository,
  OpenAPIMaterialRepository,
  OpenAPIProductRepository,
} from '../data';
import { MaterialListUsecase, ProductCreateUsecase } from '../domain';
import {
  MaterialListProvider,
  ProductCreateProvider,
  ProductCreateScreen as ProductCreateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getProductCreateScreenDehydratedState(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: categoryListQueryKey(),
    queryFn: () => categoryList(),
  });

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
    <ProductCreateProvider usecase={productCreateUsecase}>
      <MaterialListProvider usecase={materialListUsecase}>
        <ProductCreateScreenView />
      </MaterialListProvider>
    </ProductCreateProvider>
  );
}
