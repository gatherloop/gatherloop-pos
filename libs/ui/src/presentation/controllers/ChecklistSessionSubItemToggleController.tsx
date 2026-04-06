import { ChecklistSessionSubItemToggleUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistSessionSubItemToggleController = (
  usecase: ChecklistSessionSubItemToggleUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
