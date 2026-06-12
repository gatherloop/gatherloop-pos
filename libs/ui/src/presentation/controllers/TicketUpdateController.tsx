import { useEffect } from 'react';
import { TicketUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useTicketUpdateController = (usecase: TicketUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Ticket Success');
    else if (state.type === 'submitError') toast.show('Update Ticket Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
      })
    ),
  });

  return {
    state,
    dispatch,
    form,
  };
};
