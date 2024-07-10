// eslint-disable-next-line @nx/enforce-module-boundaries
import { useMaterialDeleteById } from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseMaterialDeleteAlertStateProps = {
  materialId: number;
  onSuccess: () => void;
};

export const useMaterialDeleteAlertState = ({
  materialId,
  onSuccess,
}: UseMaterialDeleteAlertStateProps) => {
  const { status, mutateAsync } = useMaterialDeleteById(materialId);

  const toast = useToastController()

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Material deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete material'));
  };

  return { status, onButtonConfirmPress };
};
