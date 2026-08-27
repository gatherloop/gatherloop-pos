import { useEffect } from 'react';
import { BudgetUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useBudgetUpdateController = (usecase: BudgetUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Budget Success');
    else if (state.type === 'submitError') toast.show('Update Budget Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
