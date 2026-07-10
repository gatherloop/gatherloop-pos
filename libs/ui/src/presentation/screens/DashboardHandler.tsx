import { useAuthLogoutController } from '../controllers';
import {
  AuthLogoutUsecase,
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
};

export const DashboardHandler = ({
  authLogoutUsecase,
  transactionStatisticListUsecase,
  expenseStatisticListUsecase,
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
      />
    </DashboardScreen>
  );
};
