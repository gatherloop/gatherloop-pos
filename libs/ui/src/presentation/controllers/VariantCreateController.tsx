import { ReactNode, useEffect } from 'react';
import { VariantCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export type VariantCreateProviderProps = {
  children: ReactNode;
  usecase: VariantCreateUsecase;
};

export const useVariantCreateController = (usecase: VariantCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Variant Success');
    else if (state.type === 'submitError') toast.show('Create Variant Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
