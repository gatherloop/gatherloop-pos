import {
  ApiAuthRepository,
  ApiExpenseRepository,
  ApiTransactionRepository,
  UrlExpenseStatisticListQueryRepository,
  UrlTransactionStatisticListQueryRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  ExpenseStatisticListParams,
  ExpenseStatisticListUsecase,
  TransactionStatisticListParams,
  TransactionStatisticListUsecase,
} from '../domain';
import { DashboardHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type DashboardAppProps = {
  transactionStatisticListParams: TransactionStatisticListParams;
  expenseStatisticListParams?: ExpenseStatisticListParams;
};

export function DashboardApp({
  transactionStatisticListParams,
  expenseStatisticListParams = { expenseStatistics: [] },
}: DashboardAppProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();
  const expenseRepository = new ApiExpenseRepository(client);
  const expenseStatisticListQueryRepository =
    new UrlExpenseStatisticListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const transactionStatisticListUsecase = new TransactionStatisticListUsecase(
    transactionRepository,
    transactionStatisticListQueryRepository,
    transactionStatisticListParams
  );
  const expenseStatisticListUsecase = new ExpenseStatisticListUsecase(
    expenseRepository,
    expenseStatisticListQueryRepository,
    expenseStatisticListParams
  );

  return (
    <DashboardHandler
      authLogoutUsecase={authLogoutUsecase}
      transactionStatisticListUsecase={transactionStatisticListUsecase}
      expenseStatisticListUsecase={expenseStatisticListUsecase}
    />
  );
}
