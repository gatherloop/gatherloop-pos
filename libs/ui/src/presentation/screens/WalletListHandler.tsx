import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useWalletListController,
} from '../controllers';
import { AuthLogoutUsecase, WalletListUsecase } from '../../domain';
import { Wallet } from '../../domain';
import { WalletListScreen, WalletListScreenProps } from './WalletListScreen';

export type WalletListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  walletListUsecase: WalletListUsecase;
};

export const WalletListHandler = ({
  authLogoutUsecase,
  walletListUsecase,
}: WalletListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const walletList = useWalletListController(walletListUsecase);
  const router = useRouter();

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
      onRetryButtonPress={() => walletList.dispatch({ type: 'FETCH' })}
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
