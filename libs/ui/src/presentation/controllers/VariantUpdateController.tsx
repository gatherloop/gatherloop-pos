import { useEffect } from 'react';
import { VariantUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useVariantUpdateController = (usecase: VariantUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Variant Success');
    else if (state.type === 'submitError') toast.show('Update Variant Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
