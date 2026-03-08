import { useToastController } from '@tamagui/toast';
import { RentalDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useRentalDeleteController = (usecase: RentalDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Rental Success');
    else if (state.type === 'deletingError') toast.show('Delete Rental Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
