// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletList } from '../../../../../api-contract/src';

export const useWalletListState = () => {
  const { data, status, error, refetch } = useWalletList();
  return {
    wallets: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
