import { useToastController } from '@tamagui/toast';
import { ExpenseDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

export const useExpenseDeleteController = (usecase: ExpenseDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Expense Success');
    else if (state.type === 'deletingError') toast.show('Delete Expense Error');
  }, [state.type, toast]);

  const onButtonConfirmPress = () => {
    dispatch({ type: 'DELETE' });
  };

  const isOpen = match(state.type)
    .with(
      P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
      () => true
    )
    .otherwise(() => false);

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const isButtonDisabled =
    state.type === 'deleting' || state.type === 'deletingSuccess';

  return {
    state,
    dispatch,
    onButtonConfirmPress,
    isOpen,
    onCancel,
    isButtonDisabled,
  };
};
