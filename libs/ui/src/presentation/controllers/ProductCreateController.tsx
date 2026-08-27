import { ReactNode, useEffect } from 'react';
import { ProductCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export type ProductCreateProviderProps = {
  children: ReactNode;
  usecase: ProductCreateUsecase;
};

export const useProductCreateController = (usecase: ProductCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Product Success');
    else if (state.type === 'submitError') toast.show('Create Product Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
