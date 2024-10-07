import { useTransactionDetailController } from '../../../../controllers';
import { TransactionDetailView } from './TransactionDetail.view';

export const TransactionDetail = () => {
  const { state } = useTransactionDetailController();
  return (
    <TransactionDetailView
      createdAt={state.transaction?.createdAt ?? new Date()}
      name={state.transaction?.name ?? ''}
      total={state.transaction?.total ?? 0}
      transactionItems={state.transaction?.transactionItems ?? []}
      paidAt={
        state.transaction?.status.type === 'paid'
          ? state.transaction?.status.paidAt
          : undefined
      }
      walletName={
        state.transaction?.status.type === 'paid'
          ? state.transaction?.status.wallet.name
          : undefined
      }
    />
  );
};
