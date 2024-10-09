// eslint-disable-next-line @nx/enforce-module-boundaries
import { productList, productListQueryKey } from '../../../api-contract/src';
import {
  OpenAPIProductRepository,
  OpenAPITransactionRepository,
} from '../data';
import { ProductListUsecase, TransactionCreateUsecase } from '../domain';
import {
  ProductListProvider,
  TransactionCreateProvider,
  TransactionCreateScreen as TransactionCreateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionCreateScreenDehydratedState(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
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
  return dehydrate(queryClient);
}

export function TransactionCreateScreen() {
  const client = useQueryClient();
  const transactionRepository = new OpenAPITransactionRepository(client);
  const transactionCreateUsecase = new TransactionCreateUsecase(
    transactionRepository
  );
  const productRepository = new OpenAPIProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);
  return (
    <TransactionCreateProvider usecase={transactionCreateUsecase}>
      <ProductListProvider usecase={productListUsecase}>
        <TransactionCreateScreenView />
      </ProductListProvider>
    </TransactionCreateProvider>
  );
}
