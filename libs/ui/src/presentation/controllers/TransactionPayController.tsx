import { useToastController } from '@tamagui/toast';
import { TransactionPayUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useTransactionPayController = (usecase: TransactionPayUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'payingSuccess') {
      toast.show('Payment Success');
    } else if (state.type === 'payingError') {
      toast.show('Payment Error');
    }
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
