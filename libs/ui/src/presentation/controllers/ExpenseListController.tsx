import { ExpenseListUsecase } from '../../domain';
import { useController } from './controller';

export const useExpenseListController = (usecase: ExpenseListUsecase) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
