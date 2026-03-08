import { useEffect } from 'react';
import { CouponUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const useCouponUpdateController = (usecase: CouponUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Coupon Success');
    else if (state.type === 'submitError') toast.show('Update Coupon Error');
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

  return {
    state,
    dispatch,
    form,
  };
};
