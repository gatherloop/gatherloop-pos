// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseProductDeleteAlertStateProps = {
  productId: number;
  onSuccess: () => void;
};

export const useProductDeleteAlertState = ({
  productId,
  onSuccess,
}: UseProductDeleteAlertStateProps) => {
  const { status, mutateAsync } = useProductDeleteById(productId);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Product deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete product'));
  };

  return { status, onButtonConfirmPress };
};
