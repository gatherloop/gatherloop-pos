import { ChecklistSessionDeleteUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistSessionDeleteController = (
  usecase: ChecklistSessionDeleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
