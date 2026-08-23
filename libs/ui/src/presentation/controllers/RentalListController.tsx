import { useCallback } from 'react';
import { RentalListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const useRentalListController = (usecase: RentalListUsecase) => {
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
