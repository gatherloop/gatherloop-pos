import { useEffect } from 'react';
import { WalletUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useWalletUpdateController = (usecase: WalletUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Wallet Success');
    else if (state.type === 'submitError') toast.show('Update Wallet Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
