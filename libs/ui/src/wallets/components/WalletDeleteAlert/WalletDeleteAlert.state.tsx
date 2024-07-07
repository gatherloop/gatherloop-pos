// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletDeleteById } from '../../../../../api-contract/src';

export type UseWalletDeleteAlertStateProps = {
  walletId: number;
  onSuccess: () => void;
};

export const useWalletDeleteAlertState = ({
  walletId,
  onSuccess,
}: UseWalletDeleteAlertStateProps) => {
  const { status, mutateAsync } = useWalletDeleteById(walletId);

  const onButtonConfirmPress = () => {
    mutateAsync({}).then(onSuccess);
  };

  return { status, onButtonConfirmPress };
};
