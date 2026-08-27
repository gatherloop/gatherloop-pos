import { useToastController } from '@tamagui/toast';
import { ExpenseUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useExpenseUpdateController = (usecase: ExpenseUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Expense Success');
    else if (state.type === 'submitError') toast.show('Update Expense Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
