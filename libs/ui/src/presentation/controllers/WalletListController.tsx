import { useCallback } from 'react';
import { WalletListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';
import { WalletListProps } from '../components';
import { match, P } from 'ts-pattern';

export const useWalletListController = (usecase: WalletListUsecase) => {
  const { state, dispatch } = useController(usecase);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<WalletListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ wallets }) => ({
      type: wallets.length > 0 ? 'loaded' : 'empty',
      items: wallets,
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
