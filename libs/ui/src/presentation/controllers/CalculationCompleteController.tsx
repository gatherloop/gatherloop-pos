import { useToastController } from '@tamagui/toast';
import { CalculationCompleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useCalculationCompleteController = (
  usecase: CalculationCompleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'completingSuccess')
      toast.show('Complete Calculation Success');
    else if (state.type === 'completingError')
      toast.show('Complete Calculation Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
