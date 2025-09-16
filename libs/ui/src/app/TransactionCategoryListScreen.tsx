import { ApiAuthRepository, ApiTransactionCategoryRepository } from '../data';
import {
  TransactionCategoryListUsecase,
  TransactionCategoryDeleteUsecase,
  AuthLogoutUsecase,
  TransactionCategoryListParams,
} from '../domain';
import { TransactionCategoryListScreen as TransactionCategoryListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionCategoryListScreenProps = {
  transactionCategoryListParams: TransactionCategoryListParams;
};

export function TransactionCategoryListScreen({
  transactionCategoryListParams,
}: TransactionCategoryListScreenProps) {
  const client = new QueryClient();
  const transactionCategoryRepository = new ApiTransactionCategoryRepository(
    client
  );
  const authRepository = new ApiAuthRepository();

  const transactionCategoryDeleteUsecase = new TransactionCategoryDeleteUsecase(
    transactionCategoryRepository
  );
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionCategoryListUsecase = new TransactionCategoryListUsecase(
    transactionCategoryRepository,
    transactionCategoryListParams
  );

  return (
    <TransactionCategoryListScreenView
      transactionCategoryListUsecase={transactionCategoryListUsecase}
      transactionCategoryDeleteUsecase={transactionCategoryDeleteUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
