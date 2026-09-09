import { useToastController } from '@tamagui/toast';
import { TransactionPayUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useEffect } from 'react';

export const useTransactionPay = (usecase: TransactionPayUsecase) => {
  const { state, dispatch } = useUsecase(usecase);

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
