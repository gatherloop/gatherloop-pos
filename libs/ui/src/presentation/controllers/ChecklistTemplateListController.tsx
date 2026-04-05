import { ChecklistTemplateListUsecase } from '../../domain';
import { useController } from './controller';

export const useChecklistTemplateListController = (
  usecase: ChecklistTemplateListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  return {
    state,
    dispatch,
  };
};
