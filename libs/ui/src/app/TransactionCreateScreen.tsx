import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  UrlProductListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductListParams,
  ProductListUsecase,
  TransactionCreateUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
} from '../domain';
import { TransactionCreateScreen as TransactionCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCreateScreenProps = {
  productListParams: ProductListParams;
  transactionPayParams: TransactionPayParams;
};

export function TransactionCreateScreen({
  productListParams,
  transactionPayParams,
}: TransactionCreateScreenProps) {
  const client = new QueryClient();
  const walletRepository = new ApiWalletRepository(client);
  const transactionRepository = new ApiTransactionRepository(client);
  const productRepository = new ApiProductRepository(client);
  const productListQueryRepository = new UrlProductListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionCreateUsecase = new TransactionCreateUsecase(
    transactionRepository
  );
  const transactionPayUsecase = new TransactionPayUsecase(
    transactionRepository,
    walletRepository,
    transactionPayParams
  );
  const productListUsecase = new ProductListUsecase(
    productRepository,
    productListQueryRepository,
    productListParams
  );

  return (
    <TransactionCreateScreenView
      productListUsecase={productListUsecase}
      transactionCreateUsecase={transactionCreateUsecase}
      transactionPayUsecase={transactionPayUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
