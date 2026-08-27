import { useEffect } from 'react';
import { ChecklistTemplateUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useChecklistTemplateUpdateController = (
  usecase: ChecklistTemplateUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Checklist Template Success');
    else if (state.type === 'submitError')
      toast.show('Update Checklist Template Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
