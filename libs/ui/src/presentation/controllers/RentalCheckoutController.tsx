import { useEffect } from 'react';
import {
  Rental,
  RentalCheckoutUsecase,
  RentalCheckoutForm,
} from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useRentalCheckoutController = (usecase: RentalCheckoutUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Checkout Rental Success');
    else if (state.type === 'submitError') toast.show('Checkout Rental Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        rentals: z.array(z.lazy(() => z.any())).min(1),
      }),
      {},
      { raw: true }
    ),
  });

  const onSubmit = (values: RentalCheckoutForm) =>
    dispatch({ type: 'SUBMIT', values });

  const rentalsFieldArray = useFieldArray<RentalCheckoutForm, 'rentals', 'key'>(
    {
      name: 'rentals',
      control: form.control,
      keyName: 'key',
    }
  );

  const onAddItem = (newRental: Rental) => {
    if (rentalsFieldArray.fields.some((rental) => rental.id === newRental.id)) {
      return;
    }

    rentalsFieldArray.append(newRental);
  };

  const isSubmitDisabled = state.type === 'submitting';

  return {
    state,
    dispatch,
    form,
    onSubmit,
    onAddItem,
    isSubmitDisabled,
    rentalsFieldArray,
  };
};
