import { useToastController } from '@tamagui/toast';
import { CalculationCompleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

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

  const onButtonConfirmPress = () => {
    dispatch({ type: 'COMPLETE' });
  };

  const isOpen = match(state.type)
    .with(
      P.union('shown', 'completing', 'completingError', 'completingSuccess'),
      () => true
    )
    .otherwise(() => false);

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const isButtonDisabled =
    state.type === 'completing' || state.type === 'completingSuccess';

  return {
    state,
    dispatch,
    onButtonConfirmPress,
    isOpen,
    onCancel,
    isButtonDisabled,
  };
};
