import { useEffect } from 'react';
import { SupplierCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useSupplierCreateController = (usecase: SupplierCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Supplier Success');
    else if (state.type === 'submitError') toast.show('Create Supplier Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
