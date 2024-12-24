import { TransactionDetailUsecase } from '../../domain';
import { useController } from './controller';

export const useTransactionDetailController = (
  usecase: TransactionDetailUsecase
) => {
  const { state } = useController(usecase);
  return {
    createdAt: state.transaction?.createdAt ?? '',
    name: state.transaction?.name ?? '',
    total: state.transaction?.total ?? 0,
    transactionItems: state.transaction?.transactionItems ?? [],
    paidAt: state.transaction?.paidAt,
    walletName: state.transaction?.wallet?.name,
  };
};
