// eslint-disable-next-line @nx/enforce-module-boundaries
import { useCategoryDeleteById } from '../../../../../api-contract/src';

export type UseCategoryDeleteAlertStateProps = {
  categoryId: number;
  onSuccess: () => void;
};

export const useCategoryDeleteAlertState = ({
  categoryId,
  onSuccess,
}: UseCategoryDeleteAlertStateProps) => {
  const { status, mutateAsync } = useCategoryDeleteById(categoryId);

  const onButtonConfirmPress = () => {
    mutateAsync({}).then(onSuccess);
  };

  return { status, onButtonConfirmPress };
};
