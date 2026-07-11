import { useEffect } from 'react';
import { BudgetCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useBudgetCreateController = (usecase: BudgetCreateUsecase) => {
  const { state, dispatch } = useController(usecase);
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Budget Success');
    else if (state.type === 'submitError') toast.show('Create Budget Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        percentage: z.number().min(0).max(100),
      })
    ),
  });

  return {
    state,
    dispatch,
    form,
  };
};
