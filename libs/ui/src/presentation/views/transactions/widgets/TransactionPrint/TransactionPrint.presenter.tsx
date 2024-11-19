import { useTransactionPrintController } from '../../../../controllers';
import { TransactionPrintView } from './TransactionPrint.view';

export const TransactionPrint = () => {
  const { state } = useTransactionPrintController();
  return (
    <TransactionPrintView
      createdAt={state.transaction?.createdAt ?? ''}
      total={state.transaction?.total ?? 0}
      transactionItems={state.transaction?.transactionItems ?? []}
    />
  );
};
