import { CategoryDeleteAlertView } from './CategoryDeleteAlert.view';
import { useCategoryDeleteController } from '../../../../controllers';

export const CategoryDeleteAlert = () => {
  const controller = useCategoryDeleteController();

  const onConfirm = () => {
    controller.dispatch({ type: 'DELETE' });
  };

  const onCancel = () => controller.dispatch({ type: 'HIDE_CONFIRMATION' });

  const isOpen =
    controller.state.type === 'shown' || controller.state.type === 'deleting';

  const isButtonDisabled = controller.state.type === 'deleting';

  return (
    <CategoryDeleteAlertView
      onConfirm={onConfirm}
      onCancel={onCancel}
      isOpen={isOpen}
      isButtonDisabled={isButtonDisabled}
    />
  );
};
