import { useCallback } from 'react';
import { BudgetListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';

export const useBudgetListController = (usecase: BudgetListUsecase) => {
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
