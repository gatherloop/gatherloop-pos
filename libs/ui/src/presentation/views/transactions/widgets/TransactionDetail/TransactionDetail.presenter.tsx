import { useTransactionDetailController } from '../../../../controllers';
import { TransactionDetailView } from './TransactionDetail.view';

export const TransactionDetail = () => {
  const { state } = useTransactionDetailController();
  return (
    <TransactionDetailView
      createdAt={state.transaction?.createdAt ?? ''}
      name={state.transaction?.name ?? ''}
      total={state.transaction?.total ?? 0}
      transactionItems={state.transaction?.transactionItems ?? []}
      paidAt={state.transaction?.paidAt}
      walletName={state.transaction?.wallet?.name}
    />
  );
};
