import { useForm } from 'react-hook-form';
import { CouponCreateUsecase, CouponForm } from '../../domain';
import { useController } from './controller';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useCouponCreateController = (usecase: CouponCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Coupon Success');
    else if (state.type === 'submitError') toast.show('Create Coupon Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({
        code: z.string().min(1),
        amount: z.number().min(1),
        type: z.string().min(1),
      })
    ),
  });

  const onSubmit = (values: CouponForm) => {
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
