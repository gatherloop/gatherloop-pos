import {
  ApiAuthRepository,
  ApiTransactionRepository,
  UrlTransactionStatisticListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  TransactionStatisticListParams,
  TransactionStatisticListUsecase,
} from '../domain';
import { TransactionStatisticHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TransactionStatisticAppProps = {
  transactionStatisticListParams: TransactionStatisticListParams;
};

export function TransactionStatisticApp({
  transactionStatisticListParams,
}: TransactionStatisticAppProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionStatisticListUsecase = new TransactionStatisticListUsecase(
    transactionRepository,
    transactionStatisticListQueryRepository,
    transactionStatisticListParams
  );

  return (
    <TransactionStatisticHandler
      transactionStatisticListUsecase={transactionStatisticListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
