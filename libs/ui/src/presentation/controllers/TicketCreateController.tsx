import { TicketCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useTicketCreateController = (usecase: TicketCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Ticket Success');
    else if (state.type === 'submitError') toast.show('Create Ticket Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
