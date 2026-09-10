import { useUsecase, useAuthLogout } from '../hooks';
import { AuthLogoutUsecase, TransactionDetailUsecase } from '../../../domain';
import { TransactionDetailScreen } from '../../views/screens/pos/TransactionDetailScreen';

export type TransactionDetailHandlerProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionDetailHandler = ({
  transactionDetailUsecase,
  authLogoutUsecase,
}: TransactionDetailHandlerProps) => {
  const transactionDetail = useUsecase(transactionDetailUsecase);
  const authLogout = useAuthLogout(authLogoutUsecase);

  return (
    <TransactionDetailScreen
      createdAt={transactionDetail.state.transaction?.createdAt ?? ''}
      name={transactionDetail.state.transaction?.name ?? ''}
      source={transactionDetail.state.transaction?.source ?? 'pos'}
      table={transactionDetail.state.transaction?.table ?? null}
      orderNumber={transactionDetail.state.transaction?.orderNumber ?? 0}
      total={transactionDetail.state.transaction?.total ?? 0}
      transactionItems={
        transactionDetail.state.transaction?.transactionItems ?? []
      }
      transactionCoupons={
        transactionDetail.state.transaction?.transactionCoupons ?? []
      }
      paidAt={transactionDetail.state.transaction?.paidAt ?? undefined}
      walletName={transactionDetail.state.transaction?.wallet?.name}
      paidAmount={transactionDetail.state.transaction?.paidAmount ?? 0}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
