import { useTransactionPrintController } from '../../../../controllers';
import { TransactionPrintView } from './TransactionPrint.view';

export const TransactionPrint = () => {
  const { state } = useTransactionPrintController();
  return (
    <TransactionPrintView
      name={state.transaction?.name ?? ''}
      createdAt={state.transaction?.createdAt ?? ''}
      paidAt={state.transaction?.paidAt ?? ''}
      total={state.transaction?.total ?? 0}
      transactionItems={state.transaction?.transactionItems ?? []}
    />
  );
};
