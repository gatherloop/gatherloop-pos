// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletTransferList } from '../../../../../api-contract/src';

export type UseWalletTransferListStateProps = {
  walletId: number;
};

export const useWalletTransferListState = ({
  walletId,
}: UseWalletTransferListStateProps) => {
  const { data, status, refetch } = useWalletTransferList(walletId);
  return { walletTransfers: data?.data ?? [], status, refetch };
};
