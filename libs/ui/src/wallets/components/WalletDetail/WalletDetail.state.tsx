// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletFindById } from '../../../../../api-contract/src';

export type UseWalletDetailStateProps = {
  walletId: number;
};

export const useWalletDetailState = ({
  walletId,
}: UseWalletDetailStateProps) => {
  const { data } = useWalletFindById(walletId);
  return { data };
};
