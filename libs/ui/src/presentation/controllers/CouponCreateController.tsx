import { CouponCreateUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useCouponCreateController = (usecase: CouponCreateUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Create Coupon Success');
    else if (state.type === 'submitError') toast.show('Create Coupon Error');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
