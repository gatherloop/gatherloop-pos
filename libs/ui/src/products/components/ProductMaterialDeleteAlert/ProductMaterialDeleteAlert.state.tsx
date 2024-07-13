// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useProductMaterialDeleteById,
  useProductMaterialFindById,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseProductMaterialDeleteAlertStateProps = {
  productId: number;
  productMaterialId: number;
  onSuccess: () => void;
};

export const useProductMaterialDeleteAlertState = ({
  productId,
  productMaterialId,
  onSuccess,
}: UseProductMaterialDeleteAlertStateProps) => {
  const { status, mutateAsync } = useProductMaterialDeleteById(
    productId,
    productMaterialId
  );
  const { data } = useProductMaterialFindById(productId, productMaterialId);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Product material deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete product material'));
  };

  return {
    status,
    onButtonConfirmPress,
    materialName: data?.data.material?.name ?? '',
  };
};
