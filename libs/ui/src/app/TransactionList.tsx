import {
  ApiAuthRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  UrlTransactionListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionDeleteUsecase,
  TransactionListParams,
  TransactionListUsecase,
  TransactionPayParams,
  TransactionPayUsecase,
  TransactionUnpayUsecase,
} from '../domain';
import { TransactionListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionListProps = {
  transactionListParams: TransactionListParams;
  transactionPayParams: TransactionPayParams;
};

export function TransactionList({
  transactionListParams,
  transactionPayParams,
}: TransactionListProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionListQueryRepository =
    new UrlTransactionListQueryRepository();
  const walletRepository = new ApiWalletRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionListUsecase = new TransactionListUsecase(
    transactionRepository,
    transactionListQueryRepository,
    walletRepository,
    transactionListParams
  );
  const transactionDeleteUsecase = new TransactionDeleteUsecase(
    transactionRepository
  );
  const transactionPayUsecase = new TransactionPayUsecase(
    transactionRepository,
    walletRepository,
    transactionPayParams
  );
  const transactionUnpayUsecase = new TransactionUnpayUsecase(
    transactionRepository
  );

  return (
    <TransactionListHandler
      authLogoutUsecase={authLogoutUsecase}
      transactionListUsecase={transactionListUsecase}
      transactionDeleteUsecase={transactionDeleteUsecase}
      transactionPayUsecase={transactionPayUsecase}
      transactionUnpayUsecase={transactionUnpayUsecase}
    />
  );
}
