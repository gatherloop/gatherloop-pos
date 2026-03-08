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

  return {
    state,
    dispatch,
  };
};
