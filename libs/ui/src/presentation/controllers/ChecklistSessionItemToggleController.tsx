import { ChecklistSessionItemToggleUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistSessionItemToggleController = (
  usecase: ChecklistSessionItemToggleUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
