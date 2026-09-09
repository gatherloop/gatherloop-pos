import { useCallback } from 'react';
import { TicketListUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useFocusEffect } from '../../../utils';

export const useTicketList = (usecase: TicketListUsecase) => {
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
