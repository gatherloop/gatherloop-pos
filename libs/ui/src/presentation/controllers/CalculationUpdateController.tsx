import { useToastController } from '@tamagui/toast';
import { CalculationUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useCalculationUpdateController = (
  usecase: CalculationUpdateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Update Calculation Success');
    else if (state.type === 'submitError')
      toast.show('Update Calculation Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
