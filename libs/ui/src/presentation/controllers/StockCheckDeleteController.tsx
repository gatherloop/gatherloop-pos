import { useEffect } from 'react';
import { StockCheckDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useStockCheckDeleteController = (usecase: StockCheckDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Stock Check Success');
    else if (state.type === 'deletingError') toast.show('Delete Stock Check Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
