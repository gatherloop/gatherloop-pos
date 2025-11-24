import { useEffect } from 'react';
import { SupplierCreateUsecase, SupplierForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useSupplierCreateController = (usecase: SupplierCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Supplier Success');
    else if (state.type === 'submitError') toast.show('Create Supplier Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        phone: z.string(),
        address: z.string().min(1),
        mapsLink: z.string().min(1),
      })
    ),
  });

  const onSubmit = (values: SupplierForm) => {
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
