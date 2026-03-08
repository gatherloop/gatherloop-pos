import { useToastController } from '@tamagui/toast';
import { ExpenseDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useExpenseDeleteController = (usecase: ExpenseDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Expense Success');
    else if (state.type === 'deletingError') toast.show('Delete Expense Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
