import { TransactionPrintUsecase } from '../../domain';
import { useController } from './controller';

export const useTransactionPrintController = (
  usecase: TransactionPrintUsecase
) => {
  const { state } = useController(usecase);
  return {
    id: state.transaction?.id ?? -1,
    name: state.transaction?.name ?? '',
    createdAt: state.transaction?.createdAt ?? '',
    paidAt: state.transaction?.paidAt ?? '',
    total: state.transaction?.total ?? 0,
    transactionItems: state.transaction?.transactionItems ?? [],
  };
};
