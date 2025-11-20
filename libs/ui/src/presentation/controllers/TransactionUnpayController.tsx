import { useToastController } from '@tamagui/toast';
import { TransactionUnpayUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useTransactionUnpayController = (
  usecase: TransactionUnpayUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'unpayingSuccess') {
      toast.show('Transaction Unpaid');
    } else if (state.type === 'unpayingError') {
      toast.show('Failed to unpay transaction');
    }
  }, [state.type, toast]);

  const onConfirm = () => dispatch({ type: 'UNPAY' });

  const isOpen =
    state.type === 'shown' ||
    state.type === 'unpaying' ||
    state.type === 'unpayingSuccess' ||
    state.type === 'unpayingError';

  const isButtonDisabled = state.type === 'unpaying';

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  return {
    state,
    dispatch,
    onConfirm,
    isOpen,
    onCancel,
    isButtonDisabled,
  };
};
