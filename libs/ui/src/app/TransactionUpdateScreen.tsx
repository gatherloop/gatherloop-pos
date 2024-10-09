// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import {
  OpenAPIProductRepository,
  OpenAPITransactionRepository,
} from '../data';
import { ProductListUsecase, TransactionUpdateUsecase } from '../domain';
import {
  ProductListProvider,
  TransactionUpdateProvider,
  TransactionUpdateScreen as TransactionUpdateScreenView,
} from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionUpdateScreenDehydratedState(
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: transactionFindByIdQueryKey(transactionId),
      queryFn: () => transactionFindById(transactionId),
    }),
    queryClient.prefetchQuery({
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
    }),
  ]);
  return dehydrate(queryClient);
}

export type TransactionUpdateScreenProps = {
  transactionId: number;
};

export function TransactionUpdateScreen({
  transactionId,
}: TransactionUpdateScreenProps) {
  const client = useQueryClient();
  const transactionRepository = new OpenAPITransactionRepository(client);
  transactionRepository.transactionByIdServerParams = transactionId;
  const transactionUsecase = new TransactionUpdateUsecase(
    transactionRepository
  );

  const productRepository = new OpenAPIProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);
  return (
    <TransactionUpdateProvider usecase={transactionUsecase}>
      <ProductListProvider usecase={productListUsecase}>
        <TransactionUpdateScreenView />
      </ProductListProvider>
    </TransactionUpdateProvider>
  );
}
