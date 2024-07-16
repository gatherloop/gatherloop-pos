// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useExpenseDeleteById,
  useExpenseFindById,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseExpenseDeleteAlertStateProps = {
  expenseId: number;
  onSuccess: () => void;
};

export const useExpenseDeleteAlertState = ({
  expenseId,
  onSuccess,
}: UseExpenseDeleteAlertStateProps) => {
  const { status, mutateAsync } = useExpenseDeleteById(expenseId);
  const { data } = useExpenseFindById(expenseId);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Expense deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete expense'));
  };

  return { status, onButtonConfirmPress };
};
