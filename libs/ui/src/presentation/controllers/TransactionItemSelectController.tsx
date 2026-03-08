import { useCallback } from 'react';
import { TransactionItemSelectUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';

export const useTransactionItemSelectController = (
  usecase: TransactionItemSelectUsecase
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
