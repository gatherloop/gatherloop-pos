import { TransactionStatisticListUsecase } from '../../domain';
import { useController } from './controller';

export const useTransactionStatisticListController = (
  usecase: TransactionStatisticListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
