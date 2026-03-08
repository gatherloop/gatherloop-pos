import { useCallback } from 'react';
import { VariantListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';

export const useVariantListController = (usecase: VariantListUsecase) => {
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
