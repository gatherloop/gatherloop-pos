import { useForm } from 'react-hook-form';
import { TicketCreateUsecase } from '../../domain';
import { useController } from './controller';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useTicketCreateController = (usecase: TicketCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Ticket Success');
    else if (state.type === 'submitError') toast.show('Create Ticket Error');
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
