import { TableCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useTableCreateController = (usecase: TableCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Table Success');
    else if (state.type === 'submitError') toast.show('Create Table Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
