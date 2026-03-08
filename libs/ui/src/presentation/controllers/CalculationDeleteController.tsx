import { useToastController } from '@tamagui/toast';
import { CalculationDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';

export const useCalculationDeleteController = (
  usecase: CalculationDeleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess')
      toast.show('Delete Calculation Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Calculation Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
