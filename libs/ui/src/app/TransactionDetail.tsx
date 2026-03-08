import { ApiAuthRepository, ApiTransactionRepository } from '../data';
import {
  AuthLogoutUsecase,
  TransactionDetailParams,
  TransactionDetailUsecase,
} from '../domain';
import { TransactionDetailHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionDetailProps = {
  transactionDetailParams: TransactionDetailParams;
};

export function TransactionDetail({
  transactionDetailParams,
}: TransactionDetailProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionDetailUsecase = new TransactionDetailUsecase(
    transactionRepository,
    transactionDetailParams
  );

  return (
    <TransactionDetailHandler
      transactionDetailUsecase={transactionDetailUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
