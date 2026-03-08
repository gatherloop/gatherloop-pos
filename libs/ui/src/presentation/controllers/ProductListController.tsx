import { useCallback } from 'react';
import { ProductListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';

export const useProductListController = (usecase: ProductListUsecase) => {
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
