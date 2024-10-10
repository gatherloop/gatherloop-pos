import { MaterialDeleteAlertView } from './MaterialDeleteAlert.view';
import { useMaterialDeleteController } from '../../../../controllers';
import { useToastController } from '@tamagui/toast';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

export const MaterialDeleteAlert = () => {
  const controller = useMaterialDeleteController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'deletingSuccess')
      toast.show('Delete Material Success');
    else if (controller.state.type === 'deletingError')
      toast.show('Delete Material Error');
  }, [controller.state.type, toast]);

  const onConfirm = () => {
    controller.dispatch({ type: 'DELETE' });
  };

  const onCancel = () => controller.dispatch({ type: 'HIDE_CONFIRMATION' });

  const isOpen = match(controller.state.type)
    .with(
      P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
      () => true
    )
    .otherwise(() => false);

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
