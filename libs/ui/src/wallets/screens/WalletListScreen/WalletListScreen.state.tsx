// eslint-disable-next-line @nx/enforce-module-boundaries
import { Wallet } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type WalletListScreenParams = {
  walletDeleteId?: number;
};

const { useParam } = createParam<WalletListScreenParams>();

export const useWalletListScreenState = () => {
  const [walletDeleteId, setWalletDeleteId] = useParam('walletDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });
  const router = useRouter();

  const onItemPress = (wallet: Wallet) => {
    router.push(`/wallets/${wallet.id}`);
  };

  const onEditMenuPress = (wallet: Wallet) => {
    router.push(`/wallets/${wallet.id}`);
  };

  const onTransferMenuPress = (wallet: Wallet) => {
    router.push(`/wallets/${wallet.id}/transfers`);
  };

  const onDeleteMenuPress = (wallet: Wallet) => {
    setWalletDeleteId(wallet.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/wallets', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setWalletDeleteId(undefined);
  };

  return {
    walletDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    onTransferMenuPress,
  };
};
