import { useEffect } from 'react';
import { CategoryUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useCategoryUpdateController = (usecase: CategoryUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Category Success');
    else if (state.type === 'submitError') toast.show('Update Category Error');
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
};;
