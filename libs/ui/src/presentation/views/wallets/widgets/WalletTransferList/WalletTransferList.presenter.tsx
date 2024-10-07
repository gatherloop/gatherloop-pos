import {
  WalletTransferListView,
  WalletTransferListViewProps,
} from './WalletTransferList.view';
import { useWalletTransferListController } from '../../../../controllers';
import { match, P } from 'ts-pattern';

export const WalletTransferList = () => {
  const { dispatch, state } = useWalletTransferListController();

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<WalletTransferListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with({ type: P.union('loaded', 'revalidating') }, (state) => ({
      type: 'loaded',
      items: state.walletTransfers.map((walletTransfer) => ({
        amount: walletTransfer.amount,
        createdAt: walletTransfer.createdAt,
        toWalletName: walletTransfer.toWallet.name,
      })),
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <WalletTransferListView
      onRetryButtonPress={onRetryButtonPress}
      variant={variant}
    />
  );
};
