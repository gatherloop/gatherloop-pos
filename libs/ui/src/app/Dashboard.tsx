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
import { DashboardHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type DashboardAppProps = {
  transactionStatisticListParams: TransactionStatisticListParams;
};

export function DashboardApp({
  transactionStatisticListParams,
}: DashboardAppProps) {
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
    <DashboardHandler
      authLogoutUsecase={authLogoutUsecase}
      transactionStatisticListUsecase={transactionStatisticListUsecase}
    />
  );
}
