import { useToastController } from '@tamagui/toast';
import { useEffect } from 'react';
import { match } from 'ts-pattern';
import { TransactionCompleteUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';

export const useTransactionComplete = (usecase: TransactionCompleteUsecase) => {
  const { state, dispatch } = useUsecase(usecase);

  const toast = useToastController();
  useEffect(() => {
    match(state)
      .with({ type: 'completingSuccess', action: 'complete' }, () => {
        toast.show('Order Marked as Ready');
      })
      .with({ type: 'completingSuccess', action: 'uncomplete' }, () => {
        toast.show('Order Marked as Preparing');
      })
      .with({ type: 'completingError' }, () => {
        toast.show('Failed to Update Fulfilment Status');
      })
      .otherwise(() => {
        // Default case, do nothing
      });
  }, [state, toast]);

  return {
    state,
    dispatch,
  };
};
