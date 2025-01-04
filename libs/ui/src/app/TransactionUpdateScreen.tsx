import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import { ApiProductRepository, ApiTransactionRepository } from '../data';
import { ProductListUsecase, TransactionUpdateUsecase } from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
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

const { useParam } = createParam<TransactionUpdateScreenProps>();

export function TransactionUpdateScreen({
  transactionId,
}: TransactionUpdateScreenProps) {
  const [transactionIdParam] = useParam('transactionId', {
    initial: transactionId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  transactionRepository.transactionByIdServerParams = transactionIdParam;
  const transactionUpdateUsecase = new TransactionUpdateUsecase(
    transactionRepository
  );

  const productRepository = new ApiProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);
  return (
    <TransactionUpdateScreenView
      productListUsecase={productListUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
    />
  );
}
