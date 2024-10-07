import { MaterialDeleteAlertView } from './MaterialDeleteAlert.view';
import { useMaterialDeleteController } from '../../../../controllers';

export const MaterialDeleteAlert = () => {
  const controller = useMaterialDeleteController();

  const onConfirm = () => {
    controller.dispatch({ type: 'DELETE' });
  };

  const onCancel = () => controller.dispatch({ type: 'HIDE_CONFIRMATION' });

  const isOpen =
    controller.state.type === 'shown' || controller.state.type === 'deleting';

  const isButtonDisabled = controller.state.type === 'deleting';

  return (
    <MaterialDeleteAlertView
      onConfirm={onConfirm}
      onCancel={onCancel}
      isOpen={isOpen}
      isButtonDisabled={isButtonDisabled}
    />
  );
};
