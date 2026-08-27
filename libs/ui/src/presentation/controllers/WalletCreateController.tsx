import { useEffect } from 'react';
import { WalletCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useWalletCreateController = (usecase: WalletCreateUsecase) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Wallet Success');
    else if (state.type === 'submitError') toast.show('Create Wallet Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
