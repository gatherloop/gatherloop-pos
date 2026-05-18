import { useCallback } from 'react';
import { StockCheckListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const useStockCheckListController = (usecase: StockCheckListUsecase) => {
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
