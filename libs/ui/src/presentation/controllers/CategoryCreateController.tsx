import { useForm } from 'react-hook-form';
import { CategoryCreateUsecase } from '../../domain';
import { useController } from './controller';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useCategoryCreateController = (usecase: CategoryCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Category Success');
    else if (state.type === 'submitError') toast.show('Create Category Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(z.object({ name: z.string().min(1) })),
  });

  return {
    state,
    dispatch,
    form,
  };
};
