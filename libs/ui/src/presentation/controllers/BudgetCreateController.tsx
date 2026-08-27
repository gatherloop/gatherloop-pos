import { useEffect } from 'react';
import { BudgetCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useBudgetCreateController = (usecase: BudgetCreateUsecase) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Budget Success');
    else if (state.type === 'submitError') toast.show('Create Budget Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
