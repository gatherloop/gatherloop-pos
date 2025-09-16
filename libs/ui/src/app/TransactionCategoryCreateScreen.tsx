import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionCategoryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionCategoryCreateParams,
  TransactionCategoryCreateUsecase,
} from '../domain';
import { TransactionCategoryCreateScreen as TransactionCategoryCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCategoryCreateScreenProps = {
  transactionCategoryCreateParams: TransactionCategoryCreateParams;
};

export function TransactionCategoryCreateScreen({
  transactionCategoryCreateParams,
}: TransactionCategoryCreateScreenProps) {
  const client = new QueryClient();
  const transactionCategoryRepository = new ApiTransactionCategoryRepository(
    client
  );
  const productRepository = new ApiProductRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionCategoryCreateUsecase = new TransactionCategoryCreateUsecase(
    transactionCategoryRepository,
    productRepository,
    transactionCategoryCreateParams
  );

  return (
    <TransactionCategoryCreateScreenView
      transactionCategoryCreateUsecase={transactionCategoryCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
