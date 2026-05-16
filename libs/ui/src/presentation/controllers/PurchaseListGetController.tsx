import { useCallback } from 'react';
import { PurchaseListGetUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const usePurchaseListGetController = (
  usecase: PurchaseListGetUsecase
) => {
  const { state, dispatch } = useController(usecase);

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
