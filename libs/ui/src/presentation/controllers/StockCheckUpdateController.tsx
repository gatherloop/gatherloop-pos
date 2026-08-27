import { useEffect } from 'react';
import { StockCheckUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useStockCheckUpdateController = (
  usecase: StockCheckUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Stock Check Success');
    else if (state.type === 'submitError')
      toast.show('Update Stock Check Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
