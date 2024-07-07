// eslint-disable-next-line @nx/enforce-module-boundaries
import { useMaterialDeleteById } from '../../../../../api-contract/src';

export type UseMaterialDeleteAlertStateProps = {
  materialId: number;
  onSuccess: () => void;
};

export const useMaterialDeleteAlertState = ({
  materialId,
  onSuccess,
}: UseMaterialDeleteAlertStateProps) => {
  const { status, mutateAsync } = useMaterialDeleteById(materialId);

  const onButtonConfirmPress = () => {
    mutateAsync({}).then(onSuccess);
  };

  return { status, onButtonConfirmPress };
};
