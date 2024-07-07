// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductDeleteById } from '../../../../../api-contract/src';

export type UseProductDeleteAlertStateProps = {
  productId: number;
  onSuccess: () => void;
};

export const useProductDeleteAlertState = ({
  productId,
  onSuccess,
}: UseProductDeleteAlertStateProps) => {
  const { status, mutateAsync } = useProductDeleteById(productId);

  const onButtonConfirmPress = () => {
    mutateAsync({}).then(onSuccess);
  };

  return { status, onButtonConfirmPress };
};
