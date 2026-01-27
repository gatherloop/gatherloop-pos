import { useEffect } from 'react';
import { Variant, RentalCheckinUsecase, RentalCheckinForm } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useRentalCheckinController = (usecase: RentalCheckinUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Checkin Rental Success');
    else if (state.type === 'submitError') toast.show('Checkin Rental Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        rentals: z
          .array(
            z.lazy(() =>
              z.object({
                code: z.string().min(1),
                variant: z.any(),
              })
            )
          )
          .min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: RentalCheckinForm) =>
    dispatch({ type: 'SUBMIT', values });

  const rentalsFieldArray = useFieldArray<RentalCheckinForm, 'rentals', 'key'>({
    name: 'rentals',
    control: form.control,
    keyName: 'key',
  });

  const onAddItem = (newVariant: Variant, amount: number) => {
    for (let i = 1; i <= amount; i++) {
      rentalsFieldArray.append({
        code: '',
        variant: newVariant,
      });
    }
  };

  const isSubmitDisabled = state.type === 'submitting';

  const onToggleCustomizeCheckinDateTime = (checked: boolean) => {
    if (checked) {
      const date = new Date();
      form.setValue('checkinAt', {
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      });
    } else {
      form.setValue('checkinAt', null);
    }
  };

  return {
    state,
    dispatch,
    form,
    onSubmit,
    onAddItem,
    isSubmitDisabled,
    rentalsFieldArray,
    onToggleCustomizeCheckinDateTime,
  };
};
