import { useEffect } from 'react';
import { MaterialUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useMaterialUpdateController = (usecase: MaterialUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Material Success');
    else if (state.type === 'submitError') toast.show('Update Material Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
