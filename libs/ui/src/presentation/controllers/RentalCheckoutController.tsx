import { useEffect } from 'react';
import { RentalCheckoutUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useRentalCheckoutController = (usecase: RentalCheckoutUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Checkout Rental Success');
    else if (state.type === 'submitError') toast.show('Checkout Rental Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
