import { useAuthLogoutController } from '../controllers';
import { AuthLogoutUsecase, TransactionStatisticListUsecase } from '../../domain';
import { DashboardScreen } from './DashboardScreen';
import { TransactionStatisticHandler } from './TransactionStatisticHandler';

export type DashboardHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
};

export const DashboardHandler = ({
  authLogoutUsecase,
  transactionStatisticListUsecase,
}: DashboardHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  return (
    <DashboardScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    >
      <TransactionStatisticHandler
        transactionStatisticListUsecase={transactionStatisticListUsecase}
      />
    </DashboardScreen>
  );
};
