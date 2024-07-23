// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useRefetchOnFocus,
  useWalletList,
} from '../../../../../api-contract/src';

export const useWalletListState = () => {
  const { data, status, error, refetch } = useWalletList();
  useRefetchOnFocus(refetch);
  return {
    wallets: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
