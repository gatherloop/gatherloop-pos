import { useEffect } from 'react';
import { TableUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTableUpdateController = (usecase: TableUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Table Success');
    else if (state.type === 'submitError') toast.show('Update Table Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
