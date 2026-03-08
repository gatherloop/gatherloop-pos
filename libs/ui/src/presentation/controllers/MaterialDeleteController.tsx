import { useEffect } from 'react';
import { MaterialDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useMaterialDeleteController = (usecase: MaterialDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Material Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Material Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
