import { useEffect } from 'react';
import { CalculationCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useCalculationCreateController = (
  usecase: CalculationCreateUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Create Calculation Success');
    else if (state.type === 'submitError')
      toast.show('Create Calculation Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
