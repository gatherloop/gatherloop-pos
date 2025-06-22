import { ApiAuthRepository, ApiTransactionRepository } from '../data';
import {
  AuthLogoutUsecase,
  TransactionDetailParams,
  TransactionDetailUsecase,
} from '../domain';
import { TransactionDetailScreen as TransactionDetailScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionDetailScreenProps = {
  transactionDetailParams: TransactionDetailParams;
};

export function TransactionDetailScreen({
  transactionDetailParams,
}: TransactionDetailScreenProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionDetailUsecase = new TransactionDetailUsecase(
    transactionRepository,
    transactionDetailParams
  );

  return (
    <TransactionDetailScreenView
      transactionDetailUsecase={transactionDetailUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
