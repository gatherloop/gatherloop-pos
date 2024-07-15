// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseTransactionDeleteAlertStateProps = {
  transactionId: number;
  onSuccess: () => void;
};

export const useTransactionDeleteAlertState = ({
  transactionId,
  onSuccess,
}: UseTransactionDeleteAlertStateProps) => {
  const { status, mutateAsync } = useTransactionDeleteById(transactionId);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Transaction deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete transaction'));
  };

  return {
    status,
    onButtonConfirmPress,
  };
};
