// eslint-disable-next-line @nx/enforce-module-boundaries
import { useBudgetDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseBudgetDeleteAlertStateProps = {
  budgetId: number;
  onSuccess: () => void;
};

export const useBudgetDeleteAlertState = ({
  budgetId,
  onSuccess,
}: UseBudgetDeleteAlertStateProps) => {
  const { status, mutateAsync } = useBudgetDeleteById(budgetId);
  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Budget deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete budget'));
  };

  return { status, onButtonConfirmPress };
};
