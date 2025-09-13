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
    orderNumber: state.transaction?.orderNumber ?? 0,
    total: state.transaction?.total ?? 0,
    transactionItems: state.transaction?.transactionItems ?? [],
    transactionCoupons: state.transaction?.transactionCoupons ?? [],
    paidAt: state.transaction?.paidAt ?? undefined,
    walletName: state.transaction?.wallet?.name,
    paidAmount: state.transaction?.paidAmount ?? 0,
  };
};
