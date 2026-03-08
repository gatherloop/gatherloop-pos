import {
  useTransactionDetailController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, TransactionDetailUsecase } from '../../domain';
import { TransactionDetailScreen } from './TransactionDetailScreen';

export type TransactionDetailHandlerProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionDetailHandler = ({
  transactionDetailUsecase,
  authLogoutUsecase,
}: TransactionDetailHandlerProps) => {
  const transactionDetail = useTransactionDetailController(
    transactionDetailUsecase
  );
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  return (
    <TransactionDetailScreen
      createdAt={transactionDetail.createdAt}
      name={transactionDetail.name}
      orderNumber={transactionDetail.orderNumber}
      total={transactionDetail.total}
      transactionItems={transactionDetail.transactionItems}
      transactionCoupons={transactionDetail.transactionCoupons}
      paidAt={transactionDetail.paidAt}
      walletName={transactionDetail.walletName}
      paidAmount={transactionDetail.paidAmount}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
