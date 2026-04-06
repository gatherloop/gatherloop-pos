import { ChecklistSessionDetailUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistSessionDetailController = (
  usecase: ChecklistSessionDetailUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
