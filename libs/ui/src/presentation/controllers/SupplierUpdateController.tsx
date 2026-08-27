import { useEffect } from 'react';
import { SupplierUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useSupplierUpdateController = (usecase: SupplierUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Supplier Success');
    else if (state.type === 'submitError') toast.show('Update Supplier Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
