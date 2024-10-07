import { useExpenseDeleteController } from '../../../../controllers';
import { ExpenseDeleteAlertView } from './ExpenseDeleteAlert.view';

export const ExpenseDeleteAlert = () => {
  const { state, dispatch } = useExpenseDeleteController();

  const onButtonConfirmPress = () => {
    dispatch({ type: 'DELETE' });
  };

  const isOpen = state.type === 'shown' || state.type === 'deleting';

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const isButtonDisabled =
    state.type === 'deleting' || state.type === 'deletingSuccess';

  return (
    <ExpenseDeleteAlertView
      isOpen={isOpen}
      onCancel={onCancel}
      onButtonConfirmPress={onButtonConfirmPress}
      isButtonDisabled={isButtonDisabled}
    />
  );
};
