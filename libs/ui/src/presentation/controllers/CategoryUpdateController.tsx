import { useEffect } from 'react';
import { CategoryUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useCategoryUpdateController = (usecase: CategoryUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Category Success');
    else if (state.type === 'submitError') toast.show('Update Category Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
