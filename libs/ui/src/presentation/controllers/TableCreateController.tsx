import { useForm } from 'react-hook-form';
import { TableCreateUsecase } from '../../domain';
import { useController } from './controller';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useTableCreateController = (usecase: TableCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Table Success');
    else if (state.type === 'submitError') toast.show('Create Table Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        label: z.string().min(1),
      })
    ),
  });

  return {
    state,
    dispatch,
    form,
  };
};
