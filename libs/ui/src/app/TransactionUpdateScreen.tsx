import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionRepository,
  UrlProductListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ProductListParams,
  ProductListUsecase,
  TransactionUpdateParams,
  TransactionUpdateUsecase,
} from '../domain';
import { TransactionUpdateScreen as TransactionUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionUpdateScreenProps = {
  transactionUpdateParams: TransactionUpdateParams;
  productListParams: ProductListParams;
};

export function TransactionUpdateScreen({
  transactionUpdateParams,
  productListParams,
}: TransactionUpdateScreenProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const productRepository = new ApiProductRepository(client);
  const productListQueryRepository = new UrlProductListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionUpdateUsecase = new TransactionUpdateUsecase(
    transactionRepository,
    transactionUpdateParams
  );
  const productListUsecase = new ProductListUsecase(
    productRepository,
    productListQueryRepository,
    productListParams
  );

  return (
    <TransactionUpdateScreenView
      productListUsecase={productListUsecase}
      transactionUpdateUsecase={transactionUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
