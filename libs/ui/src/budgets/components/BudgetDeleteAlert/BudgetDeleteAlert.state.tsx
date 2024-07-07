// eslint-disable-next-line @nx/enforce-module-boundaries
import { useBudgetDeleteById } from '../../../../../api-contract/src';

export type UseBudgetDeleteAlertStateProps = {
  budgetId: number;
  onSuccess: () => void;
};

export const useBudgetDeleteAlertState = ({
  budgetId,
  onSuccess,
}: UseBudgetDeleteAlertStateProps) => {
  const { status, mutateAsync } = useBudgetDeleteById(budgetId);

  const onButtonConfirmPress = () => {
    mutateAsync({}).then(onSuccess);
  };

  return { status, onButtonConfirmPress };
};
