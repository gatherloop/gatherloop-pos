import { useEffect } from 'react';
import { TransactionCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTransactionCreateController = (
  usecase: TransactionCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Transaction Success');
    else if (state.type === 'submitError')
      toast.show('Create Transaction Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
