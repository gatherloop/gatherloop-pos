import { useCallback } from 'react';
import { WalletTransferListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';

export const useWalletTransferListController = (
  usecase: WalletTransferListUsecase
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
