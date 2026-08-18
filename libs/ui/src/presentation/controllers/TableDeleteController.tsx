import { useEffect } from 'react';
import { TableDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTableDeleteController = (usecase: TableDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Table Success');
    else if (state.type === 'deletingError') toast.show('Delete Table Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
