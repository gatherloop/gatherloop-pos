import { useToastController } from '@tamagui/toast';
import { VariantDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useVariantDeleteController = (usecase: VariantDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Variant Success');
    else if (state.type === 'deletingError') toast.show('Delete Variant Error');
  }, [state.type, toast]);

  return { state, dispatch };
};
