import { WalletTransferListUsecase } from '../../domain';
import { useController } from './controller';
import { match, P } from 'ts-pattern';
import { WalletTransferListProps } from '../components';

export const useWalletTransferListController = (
  usecase: WalletTransferListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<WalletTransferListProps['variant']>()
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

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
