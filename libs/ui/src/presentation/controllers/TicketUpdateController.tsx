import { useEffect } from 'react';
import { TicketUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTicketUpdateController = (usecase: TicketUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Ticket Success');
    else if (state.type === 'submitError') toast.show('Update Ticket Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
