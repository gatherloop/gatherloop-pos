import { useCallback } from 'react';
import { ChecklistSessionListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const useChecklistSessionListController = (
  usecase: ChecklistSessionListUsecase
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
