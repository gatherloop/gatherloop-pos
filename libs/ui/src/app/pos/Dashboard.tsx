import {
  ApiAuthRepository,
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiTransactionRepository,
  InMemoryTransactionStatisticListQueryRepository,
  UrlExpenseStatisticListQueryRepository,
  UrlTransactionStatisticListQueryRepository,
} from '../../data';
import {
  AuthLogoutUsecase,
  BudgetListParams,
  BudgetListUsecase,
  ExpenseStatisticListParams,
  ExpenseStatisticListUsecase,
  TransactionStatisticListParams,
  TransactionStatisticListUsecase,
} from '../../domain';
import { DashboardHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type DashboardAppProps = {
  transactionStatisticListParams: TransactionStatisticListParams;
  expenseStatisticListParams?: ExpenseStatisticListParams;
  expenseRevenueStatisticListParams?: TransactionStatisticListParams;
  budgetListParams?: BudgetListParams;
};

export function DashboardApp({
  transactionStatisticListParams,
  expenseStatisticListParams = { expenseStatistics: [] },
  expenseRevenueStatisticListParams = { transactionStatistics: [] },
  budgetListParams = { budgets: [] },
}: DashboardAppProps) {
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();
  const expenseRepository = new ApiExpenseRepository(client);
  const expenseStatisticListQueryRepository =
    new UrlExpenseStatisticListQueryRepository();
  const budgetRepository = new ApiBudgetRepository(client);
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
  const expenseRevenueStatisticListUsecase = new TransactionStatisticListUsecase(
    transactionRepository,
    new InMemoryTransactionStatisticListQueryRepository(),
    expenseRevenueStatisticListParams
  );
  const budgetListUsecase = new BudgetListUsecase(
    budgetRepository,
    budgetListParams
  );

  return (
    <DashboardHandler
      authLogoutUsecase={authLogoutUsecase}
      transactionStatisticListUsecase={transactionStatisticListUsecase}
      expenseStatisticListUsecase={expenseStatisticListUsecase}
      expenseRevenueStatisticListUsecase={expenseRevenueStatisticListUsecase}
      budgetListUsecase={budgetListUsecase}
    />
  );
}
