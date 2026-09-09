import { useCallback } from 'react';
import { SupplierListUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useFocusEffect } from '../../../utils';

export const useSupplierList = (usecase: SupplierListUsecase) => {
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
