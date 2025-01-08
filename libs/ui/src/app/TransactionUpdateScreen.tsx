import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
  transactionFindById,
  transactionFindByIdQueryKey,
} from '../../../api-contract/src';
import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductListUsecase,
  TransactionUpdateUsecase,
} from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';

export async function getTransactionUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  transactionId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: transactionFindByIdQueryKey(transactionId),
      queryFn: () =>
        transactionFindById(transactionId, {
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
    queryClient.prefetchQuery({
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

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TransactionUpdateScreenView
      productListUsecase={productListUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
