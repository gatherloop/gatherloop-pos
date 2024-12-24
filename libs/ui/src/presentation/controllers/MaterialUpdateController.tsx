import { useEffect } from 'react';
import { MaterialForm, MaterialUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useMaterialUpdateController = (usecase: MaterialUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Material Success');
    else if (state.type === 'submitError') toast.show('Update Material Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        price: z.number().min(1),
        unit: z.string().min(1),
      })
    ),
  });

  const onSubmit = (values: MaterialForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    state.type === 'submitting' ||
    state.type === 'submitError' ||
    state.type === 'submitSuccess';

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
  };
};
