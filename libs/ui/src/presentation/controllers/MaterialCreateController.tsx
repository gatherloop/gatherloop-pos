import { useEffect } from 'react';
import { MaterialCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useMaterialCreateController = (usecase: MaterialCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Material Success');
    else if (state.type === 'submitError') toast.show('Create Material Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
