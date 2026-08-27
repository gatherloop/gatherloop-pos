import { useEffect } from 'react';
import { RentalCheckinUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useRentalCheckinController = (usecase: RentalCheckinUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Checkin Rental Success');
    else if (state.type === 'submitError') toast.show('Checkin Rental Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
