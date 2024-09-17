// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletList, Wallet } from '../../../../../api-contract/src';
import { useRouter } from 'solito/router';

export const useWalletListState = () => {
  const { data, status, error, refetch } = useWalletList();

  const router = useRouter();

  const onEditMenuPress = (wallet: Wallet) => {
    router.push(`/wallets/${wallet.id}`);
  };

  const onTransferMenuPress = (wallet: Wallet) => {
    router.push(`/wallets/${wallet.id}/transfers`);
  };

  return {
    wallets: data?.data ?? [],
    status,
    error,
    refetch,
    onEditMenuPress,
    onTransferMenuPress
  };
};
