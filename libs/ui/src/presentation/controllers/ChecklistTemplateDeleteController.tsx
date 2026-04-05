import { ChecklistTemplateDeleteUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistTemplateDeleteController = (
  usecase: ChecklistTemplateDeleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
