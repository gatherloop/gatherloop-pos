import { useEffect } from 'react';
import { TransactionUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTransactionUpdateController = (
  usecase: TransactionUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Transaction Success');
    else if (state.type === 'submitError')
      toast.show('Update Transaction Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
