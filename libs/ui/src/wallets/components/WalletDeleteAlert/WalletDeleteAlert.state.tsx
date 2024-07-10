// eslint-disable-next-line @nx/enforce-module-boundaries
import { useWalletDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseWalletDeleteAlertStateProps = {
  walletId: number;
  onSuccess: () => void;
};

export const useWalletDeleteAlertState = ({
  walletId,
  onSuccess,
}: UseWalletDeleteAlertStateProps) => {
  const { status, mutateAsync } = useWalletDeleteById(walletId);

  const toast = useToastController()

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Wallet deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete wallet'));
  };

  return { status, onButtonConfirmPress };
};
