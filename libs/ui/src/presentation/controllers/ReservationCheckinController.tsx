import { useEffect } from 'react';
import {
  Variant,
  ReservationCheckinUsecase,
  ReservationCheckinForm,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useReservationCheckinController = (
  usecase: ReservationCheckinUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Checkin Reservation Success');
    else if (state.type === 'submitError')
      toast.show('Checkin Reservation Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
        reservations: z
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

  const onSubmit = (values: ReservationCheckinForm) =>
    dispatch({ type: 'SUBMIT', values });

  const reservationsFieldArray = useFieldArray<
    ReservationCheckinForm,
    'reservations',
    'key'
  >({
    name: 'reservations',
    control: form.control,
    keyName: 'key',
  });

  const onAddItem = (newVariant: Variant) => {
    reservationsFieldArray.append({
      code: '',
      variant: newVariant,
    });
  };

  const isSubmitDisabled = state.type === 'submitting';

  return {
    state,
    dispatch,
    form,
    onSubmit,
    onAddItem,
    isSubmitDisabled,
    reservationsFieldArray,
  };
};
