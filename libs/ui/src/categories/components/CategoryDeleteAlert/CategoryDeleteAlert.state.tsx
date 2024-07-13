// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  useCategoryDeleteById,
  useCategoryFindById,
} from '../../../../../api-contract/src';
import { useToastController } from '@tamagui/toast';

export type UseCategoryDeleteAlertStateProps = {
  categoryId: number;
  onSuccess: () => void;
};

export const useCategoryDeleteAlertState = ({
  categoryId,
  onSuccess,
}: UseCategoryDeleteAlertStateProps) => {
  const { status, mutateAsync } = useCategoryDeleteById(categoryId);
  const { data } = useCategoryFindById(categoryId);

  const toast = useToastController();

  const onButtonConfirmPress = () => {
    mutateAsync({})
      .then(() => toast.show('Category deleted successfully'))
      .then(onSuccess)
      .catch(() => toast.show('Failed to delete category'));
  };

  return { status, onButtonConfirmPress, categoryName: data?.data.name };
};
