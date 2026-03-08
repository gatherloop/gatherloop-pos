import { useEffect } from 'react';
import { CategoryDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useCategoryDeleteController = (usecase: CategoryDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Category Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Category Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
