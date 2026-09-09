import { useCallback } from 'react';
import { CouponListUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useFocusEffect } from '../../../utils';

export const useCouponList = (usecase: CouponListUsecase) => {
  const { state, dispatch } = useUsecase(usecase);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  return {
    state,
    dispatch,
  };
};
