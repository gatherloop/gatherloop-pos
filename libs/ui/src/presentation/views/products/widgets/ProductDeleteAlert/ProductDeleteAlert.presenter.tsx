import { ProductDeleteAlertView } from './ProductDeleteAlert.view';
import { useProductDeleteController } from '../../../../controllers';

export const ProductDeleteAlert = () => {
  const controller = useProductDeleteController();

  const onConfirm = () => {
    controller.dispatch({ type: 'DELETE' });
  };

  const onCancel = () => controller.dispatch({ type: 'HIDE_CONFIRMATION' });

  const isOpen =
    controller.state.type === 'shown' || controller.state.type === 'deleting';

  const isButtonDisabled = controller.state.type === 'deleting';

  return (
    <ProductDeleteAlertView
      onConfirm={onConfirm}
      onCancel={onCancel}
      isOpen={isOpen}
      isButtonDisabled={isButtonDisabled}
    />
  );
};
