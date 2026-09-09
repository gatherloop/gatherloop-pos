import { useCallback } from 'react';
import { TransactionItemSelectUsecase } from '../../../domain';
import { useFocusEffect } from '../../../utils';
import { useUsecase } from './useUsecase';

export const useTransactionItemSelect = (
  usecase: TransactionItemSelectUsecase
) => {
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
