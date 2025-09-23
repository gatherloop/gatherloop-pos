import { useEffect } from 'react';
import {
  Reservation,
  ReservationCheckoutUsecase,
  ReservationCheckoutForm,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useReservationCheckoutController = (
  usecase: ReservationCheckoutUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess')
      toast.show('Checkout Reservation Success');
    else if (state.type === 'submitError')
      toast.show('Checkout Reservation Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        reservations: z.array(z.lazy(() => z.any())).min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: ReservationCheckoutForm) =>
    dispatch({ type: 'SUBMIT', values });

  const reservationsFieldArray = useFieldArray<
    ReservationCheckoutForm,
    'reservations',
    'key'
  >({
    name: 'reservations',
    control: form.control,
    keyName: 'key',
  });

  const onAddItem = (newReservation: Reservation) => {
    if (
      reservationsFieldArray.fields.some(
        (reservation) => reservation.id === newReservation.id
      )
    ) {
      return;
    }

    reservationsFieldArray.append(newReservation);
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
