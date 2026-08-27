import { useEffect } from 'react';
import { ChecklistSessionCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useChecklistSessionCreateController = (
  usecase: ChecklistSessionCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Checklist session created');
    else if (state.type === 'submitError')
      toast.show('Failed to create checklist session');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
