import { useEffect } from 'react';
import { CouponUpdateUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useCouponUpdateController = (usecase: CouponUpdateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Update Coupon Success');
    else if (state.type === 'submitError') toast.show('Update Coupon Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
