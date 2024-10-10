import { ProductDeleteAlertView } from './ProductDeleteAlert.view';
import { useProductDeleteController } from '../../../../controllers';
import { useToastController } from '@tamagui/toast';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

export const ProductDeleteAlert = () => {
  const controller = useProductDeleteController();

  const toast = useToastController();
  useEffect(() => {
    if (controller.state.type === 'deletingSuccess')
      toast.show('Delete Product Success');
    else if (controller.state.type === 'deletingError')
      toast.show('Delete Product Error');
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
    <ProductDeleteAlertView
      onConfirm={onConfirm}
      onCancel={onCancel}
      isOpen={isOpen}
      isButtonDisabled={isButtonDisabled}
    />
  );
};
