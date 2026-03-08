import { useToastController } from '@tamagui/toast';
import { ProductDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useProductDeleteController = (usecase: ProductDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Product Success');
    else if (state.type === 'deletingError') toast.show('Delete Product Error');
  }, [state.type, toast]);

  return { state, dispatch };
};
