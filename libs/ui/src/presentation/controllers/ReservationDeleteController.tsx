import { useToastController } from '@tamagui/toast';
import { ReservationDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

export const useReservationDeleteController = (
  usecase: ReservationDeleteUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess')
      toast.show('Delete Reservation Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Reservation Error');
  }, [state.type, toast]);

  const isButtonDisabled = state.type === 'deleting';

  const isOpen = match(state.type)
    .with(
      P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
      () => true
    )
    .otherwise(() => false);

  const onButtonConfirmPress = () => dispatch({ type: 'DELETE' });

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  return {
    state,
    dispatch,
    isButtonDisabled,
    isOpen,
    onButtonConfirmPress,
    onCancel,
  };
};
