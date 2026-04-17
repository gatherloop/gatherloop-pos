import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useWalletDetailController,
  useWalletTransferListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  WalletDetailUsecase,
  WalletTransferListUsecase,
} from '../../domain';
import { WalletTransferListScreen, WalletTransferListScreenProps } from './WalletTransferListScreen';
import { WalletTransferListProps } from '../components';

export type WalletTransferListHandlerProps = {
  walletId: number;
  authLogoutUsecase: AuthLogoutUsecase;
  walletDetailUsecase: WalletDetailUsecase;
  walletTransferListUsecase: WalletTransferListUsecase;
};

export const WalletTransferListHandler = ({
  walletId: initialWalletId,
  authLogoutUsecase,
  walletDetailUsecase,
  walletTransferListUsecase,
}: WalletTransferListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const walletDetail = useWalletDetailController(walletDetailUsecase);
  const walletTransfers = useWalletTransferListController(
    walletTransferListUsecase
  );
  const router = useRouter();

  return (
    <WalletTransferListScreen
      walletId={walletDetail.state.wallet?.id ?? initialWalletId}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      name={walletDetail.state.wallet?.name ?? ''}
      balance={walletDetail.state.wallet?.balance ?? 0}
      paymentCostPercentage={
        walletDetail.state.wallet?.paymentCostPercentage ?? 0
      }
      variant={match(walletTransfers.state)
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
        .exhaustive()}
      onEmptyActionPress={() => router.push(`/wallets/${walletDetail.state.wallet?.id ?? initialWalletId}/transfers/create`)}
      onRetryButtonPress={() => walletTransfers.dispatch({ type: 'FETCH' })}
      isRevalidating={walletTransfers.state.type === 'revalidating'}
    />
  );
};
