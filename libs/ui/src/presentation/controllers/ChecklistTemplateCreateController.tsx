import { useEffect } from 'react';
import { ChecklistTemplateCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useChecklistTemplateCreateController = (
  usecase: ChecklistTemplateCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Checklist Template Success');
    else if (state.type === 'submitError')
      toast.show('Create Checklist Template Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
