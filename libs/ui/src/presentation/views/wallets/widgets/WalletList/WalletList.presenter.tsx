import { match, P } from 'ts-pattern';
import { Wallet } from '../../../../../domain';
import { WalletListView, WalletListViewProps } from './WalletList.view';
import { useWalletListController } from '../../../../controllers';
import { useFocusEffect } from '../../../../../utils';
import { useCallback } from 'react';

export type WalletListProps = {
  onItemPress?: (wallet: Wallet) => void;
  onEditMenuPress?: (wallet: Wallet) => void;
  onTransferMenuPress?: (wallet: Wallet) => void;
};

export const WalletList = ({
  onEditMenuPress,
  onItemPress,
  onTransferMenuPress,
}: WalletListProps) => {
  const { state, dispatch } = useWalletListController();

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<WalletListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ wallets }) => ({
      type: wallets.length > 0 ? 'loaded' : 'empty',
      items: wallets.map((wallet) => ({
        name: wallet.name,
        balance: wallet.balance,
        paymentCostPercentage: wallet.paymentCostPercentage,
        onEditMenuPress: onEditMenuPress
          ? () => onEditMenuPress(wallet)
          : undefined,
        onPress: onItemPress ? () => onItemPress(wallet) : undefined,
        onTransferMenuPress: onTransferMenuPress
          ? () => onTransferMenuPress(wallet)
          : undefined,
      })),
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <WalletListView onRetryButtonPress={onRetryButtonPress} variant={variant} />
  );
};
