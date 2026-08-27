import { CategoryCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useCategoryCreateController = (usecase: CategoryCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Category Success');
    else if (state.type === 'submitError') toast.show('Create Category Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
