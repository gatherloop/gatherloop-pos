import { ChecklistSessionListUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistSessionListController = (
  usecase: ChecklistSessionListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
