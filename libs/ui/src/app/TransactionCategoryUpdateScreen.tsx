import {
  ApiAuthRepository,
  ApiProductRepository,
  ApiTransactionCategoryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionCategoryUpdateParams,
  TransactionCategoryUpdateUsecase,
} from '../domain';
import { TransactionCategoryUpdateScreen as TransactionCategoryUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCategoryUpdateScreenProps = {
  transactionCategoryUpdateParams: TransactionCategoryUpdateParams;
};

export function TransactionCategoryUpdateScreen({
  transactionCategoryUpdateParams,
}: TransactionCategoryUpdateScreenProps) {
  const client = new QueryClient();
  const transactionCategoryRepository = new ApiTransactionCategoryRepository(
    client
  );
  const productRepository = new ApiProductRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionCategoryUpdateUsecase = new TransactionCategoryUpdateUsecase(
    transactionCategoryRepository,
    productRepository,
    transactionCategoryUpdateParams
  );

  return (
    <TransactionCategoryUpdateScreenView
      transactionCategoryUpdateUsecase={transactionCategoryUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
