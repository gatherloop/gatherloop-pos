import { useCallback } from 'react';
import { WalletListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';

export const useWalletListController = (usecase: WalletListUsecase) => {
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
