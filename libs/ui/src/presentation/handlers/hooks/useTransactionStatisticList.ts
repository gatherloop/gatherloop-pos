import { TransactionStatisticListUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';

export const useTransactionStatisticList = (
  usecase: TransactionStatisticListUsecase
) => {
  const { state, dispatch } = useUsecase(usecase);

  return {
    state,
    dispatch,
  };
};
