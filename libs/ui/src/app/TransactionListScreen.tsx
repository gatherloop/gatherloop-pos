import {
  ApiAuthRepository,
  ApiTransactionRepository,
  ApiWalletRepository,
  UrlTransactionListQueryRepository,
} from '../data';
import {
  TransactionListUsecase,
  TransactionDeleteUsecase,
  TransactionPayUsecase,
  AuthLogoutUsecase,
  TransactionListParams,
  TransactionPayParams,
} from '../domain';
import { TransactionListScreen as TransactionListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionListScreenProps = {
  transactionListParams: TransactionListParams;
  transactionPayParams: TransactionPayParams;
};

export function TransactionListScreen({
  transactionListParams,
  transactionPayParams,
}: TransactionListScreenProps) {
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

  return (
    <TransactionListScreenView
      transactionDeleteUsecase={transactionDeleteUsecase}
      transactionListUsecase={transactionListUsecase}
      transactionPayUsecase={transactionPayUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
