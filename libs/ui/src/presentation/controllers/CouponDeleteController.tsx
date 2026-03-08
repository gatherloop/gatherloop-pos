import { useEffect } from 'react';
import { CouponDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useCouponDeleteController = (usecase: CouponDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Coupon Success');
    else if (state.type === 'deletingError') toast.show('Delete Coupon Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
