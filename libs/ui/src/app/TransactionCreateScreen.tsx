// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  productList,
  productListQueryKey,
  walletList,
  walletListQueryKey,
} from '../../../api-contract/src';
import { GetServerSidePropsContext } from 'next';
import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductListUsecase,
  TransactionCreateUsecase,
  TransactionPayUsecase,
} from '../domain';
import { TransactionCreateScreen as TransactionCreateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';

export async function getTransactionCreateScreenDehydratedState(
  ctx: GetServerSidePropsContext
): Promise<DehydratedState> {
  const queryClient = new QueryClient();

  await Promise.all([
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
    queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () =>
        walletList({
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
  ]);
  return dehydrate(queryClient);
}

export function TransactionCreateScreen() {
  const client = useQueryClient();

  const walletRepository = new ApiWalletRepository(client);
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionCreateUsecase = new TransactionCreateUsecase(
    transactionRepository
  );
  const transactionPayUsecase = new TransactionPayUsecase(
    transactionRepository,
    walletRepository
  );

  const productRepository = new ApiProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TransactionCreateScreenView
      productListUsecase={productListUsecase}
      transactionCreateUsecase={transactionCreateUsecase}
      transactionPayUsecase={transactionPayUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
