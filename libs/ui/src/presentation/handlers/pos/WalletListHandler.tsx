import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useCallback } from 'react';
import { useUsecase, useAuthLogout } from '../hooks';
import { useFocusEffect } from '../../../utils';
import { AuthLogoutUsecase, WalletListUsecase } from '../../../domain';
import { Wallet } from '../../../domain';
import { WalletListScreen, WalletListScreenProps } from '../../views/screens/pos/WalletListScreen';

export type WalletListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  walletListUsecase: WalletListUsecase;
};

export const WalletListHandler = ({
  authLogoutUsecase,
  walletListUsecase,
}: WalletListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const walletList = useUsecase(walletListUsecase);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      walletList.dispatch({ type: 'FETCH' });
    }, [walletList.dispatch])
  );

  return (
    <WalletListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(wallet: Wallet) =>
        router.push(`/wallets/${wallet.id}`)
      }
      onItemPress={(wallet: Wallet) =>
        router.push(`/wallets/${wallet.id}/transfers`)
      }
      onTransferMenuPress={(wallet: Wallet) =>
        router.push(`/wallets/${wallet.id}/transfers`)
      }
      onEmptyActionPress={() => router.push('/wallets/create')}
      onRetryButtonPress={() => walletList.dispatch({ type: 'FETCH' })}
      isRevalidating={walletList.state.type === 'revalidating'}
      variant={match(walletList.state)
        .returnType<WalletListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('loaded', 'revalidating') },
          ({ wallets }) => ({
            type: wallets.length > 0 ? 'loaded' : 'empty',
            items: wallets,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
