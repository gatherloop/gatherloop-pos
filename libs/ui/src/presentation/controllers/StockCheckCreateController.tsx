import { useEffect } from 'react';
import { StockCheckCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useStockCheckCreateController = (
  usecase: StockCheckCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Stock Check Success');
    else if (state.type === 'submitError')
      toast.show('Create Stock Check Error');
  }, [toast, state.type]);

  return { state, dispatch };
};
