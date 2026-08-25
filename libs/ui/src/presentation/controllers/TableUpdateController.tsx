import { useEffect, useRef } from 'react';
import { TableUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useTableUpdateController = (usecase: TableUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Table Success');
    else if (state.type === 'submitError') toast.show('Update Table Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        label: z.string().min(1),
        floorNumber: z.number().int().min(1),
      })
    ),
  });

  const hasFilledFormRef = useRef(false);
  useEffect(() => {
    if (state.type === 'loaded' && !hasFilledFormRef.current) {
      form.reset(state.values);
      hasFilledFormRef.current = true;
    }
  }, [state.type, state.values, form]);

  return {
    state,
    dispatch,
    form,
  };
};
