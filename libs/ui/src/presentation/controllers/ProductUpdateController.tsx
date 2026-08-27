import { useEffect } from 'react';
import { ProductUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useProductUpdateController = (usecase: ProductUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Product Success');
    else if (state.type === 'submitError') toast.show('Update Product Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
