import { useEffect } from 'react';
import { WalletTransferCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useWalletTransferCreateController = (
  usecase: WalletTransferCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Transfer Success');
    else if (state.type === 'submitError') toast.show('Transfer Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
