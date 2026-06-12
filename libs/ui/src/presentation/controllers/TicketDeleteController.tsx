import { useEffect } from 'react';
import { TicketDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTicketDeleteController = (usecase: TicketDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Ticket Success');
    else if (state.type === 'deletingError') toast.show('Delete Ticket Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
