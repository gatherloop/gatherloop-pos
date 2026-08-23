import { useCallback } from 'react';
import { TransactionListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const useTransactionListController = (
  usecase: TransactionListUsecase
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
