import { useAuthLogoutController } from '../controllers';
import {
  AuthLogoutUsecase,
  BudgetListUsecase,
  ExpenseStatisticListUsecase,
  TransactionStatisticListUsecase,
} from '../../domain';
import { DashboardScreen } from './DashboardScreen';
import { TransactionStatisticHandler } from './TransactionStatisticHandler';
import { ExpenseStatisticHandler } from './ExpenseStatisticHandler';

export type DashboardHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
  expenseStatisticListUsecase: ExpenseStatisticListUsecase;
  expenseRevenueStatisticListUsecase: TransactionStatisticListUsecase;
  budgetListUsecase: BudgetListUsecase;
};

export const DashboardHandler = ({
  authLogoutUsecase,
  transactionStatisticListUsecase,
  expenseStatisticListUsecase,
  expenseRevenueStatisticListUsecase,
  budgetListUsecase,
}: DashboardHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  return (
    <DashboardScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    >
      <TransactionStatisticHandler
        transactionStatisticListUsecase={transactionStatisticListUsecase}
      />
      <ExpenseStatisticHandler
        expenseStatisticListUsecase={expenseStatisticListUsecase}
        transactionStatisticListUsecase={expenseRevenueStatisticListUsecase}
        budgetListUsecase={budgetListUsecase}
      />
    </DashboardScreen>
  );
};
