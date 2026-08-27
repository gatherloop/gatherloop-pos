import { useEffect } from 'react';
import { ExpenseCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useExpenseCreateController = (usecase: ExpenseCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Expense Success');
    else if (state.type === 'submitError') toast.show('Create Expense Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
