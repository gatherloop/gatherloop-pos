import { useEffect } from 'react';
import { SupplierDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useSupplierDeleteController = (usecase: SupplierDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Supplier Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Supplier Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
