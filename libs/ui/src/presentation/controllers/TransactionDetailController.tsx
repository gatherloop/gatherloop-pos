import { TransactionDetailUsecase } from '../../domain';
import { useController } from './controller';

export const useTransactionDetailController = (
  usecase: TransactionDetailUsecase
) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
    id: state.transaction?.id ?? -1,
    createdAt: state.transaction?.createdAt ?? '',
    name: state.transaction?.name ?? '',
    total: state.transaction?.total ?? 0,
    transactionItems: state.transaction?.transactionItems ?? [],
    paidAt: state.transaction?.paidAt ?? undefined,
    walletName: state.transaction?.wallet?.name,
    paidAmount: state.transaction?.paidAmount ?? 0,
  };
};
