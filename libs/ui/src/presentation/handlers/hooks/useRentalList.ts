import { useCallback } from 'react';
import { RentalListUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useFocusEffect } from '../../../utils';

export const useRentalList = (usecase: RentalListUsecase) => {
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
