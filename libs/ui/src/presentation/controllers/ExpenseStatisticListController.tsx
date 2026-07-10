import { ExpenseStatisticListUsecase } from '../../domain';
import { useController } from './controller';

export const useExpenseStatisticListController = (
  usecase: ExpenseStatisticListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
