import { useEffect } from 'react';
import { CategoryDeleteUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';

export const useCategoryDeleteController = (usecase: CategoryDeleteUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'deletingSuccess') toast.show('Delete Category Success');
    else if (state.type === 'deletingError')
      toast.show('Delete Category Error');
  }, [state.type, toast]);

  const onConfirm = () => dispatch({ type: 'DELETE' });

  const onCancel = () => dispatch({ type: 'HIDE_CONFIRMATION' });

  const isOpen = match(state.type)
    .with(
      P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
      () => true
    )
    .otherwise(() => false);

  const isButtonDisabled = state.type === 'deleting';

  return {
    state,
    dispatch,
    onConfirm,
    onCancel,
    isOpen,
    isButtonDisabled,
  };
};
