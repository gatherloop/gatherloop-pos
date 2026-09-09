import { useCallback } from 'react';
import { BudgetListUsecase } from '../../../domain';
import { useFocusEffect } from '../../../utils';
import { useUsecase } from './useUsecase';

export const useBudgetList = (usecase: BudgetListUsecase) => {
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
