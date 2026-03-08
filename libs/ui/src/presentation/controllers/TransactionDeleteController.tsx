import { useToastController } from '@tamagui/toast';
import { TransactionDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useTransactionDeleteController = (
  usecase: TransactionDeleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess')
      toast.show('Delete Transaction Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Transaction Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
