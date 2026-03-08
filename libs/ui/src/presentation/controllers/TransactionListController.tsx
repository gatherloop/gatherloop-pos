import { TransactionListUsecase } from '../../domain';
import { useController } from './controller';

export const useTransactionListController = (
  usecase: TransactionListUsecase
) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
