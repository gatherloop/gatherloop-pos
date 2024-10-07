import { useTransactionDeleteController } from '../../../../controllers';
import { TransactionDeleteAlertView } from './TransactionDeleteAlert.view';

export const TransactionDeleteAlert = () => {
  const { state, dispatch } = useTransactionDeleteController();

  const isButtonDisabled = state.type === 'deleting';

  const isOpen =
    state.type === 'shown' ||
    state.type === 'deleting' ||
    state.type === 'deletingSuccess';

  const onButtonConfirmPress = () => dispatch({ type: 'DELETE' });

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  return (
    <TransactionDeleteAlertView
      isButtonDisabled={isButtonDisabled}
      isOpen={isOpen}
      onButtonConfirmPress={onButtonConfirmPress}
      onCancel={onCancel}
    />
  );
};
