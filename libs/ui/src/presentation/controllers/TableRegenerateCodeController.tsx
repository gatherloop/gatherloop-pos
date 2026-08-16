import { useEffect } from 'react';
import { TableRegenerateCodeUsecase } from '../../domain';
import { useController } from './controller';
import { useToastController } from '@tamagui/toast';

export const useTableRegenerateCodeController = (
  usecase: TableRegenerateCodeUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();
  useEffect(() => {
    if (state.type === 'regeneratingSuccess')
      toast.show('Regenerate Table Code Success');
    else if (state.type === 'regeneratingError')
      toast.show('Regenerate Table Code Error');
  }, [state.type, toast]);

  return {
    state,
    dispatch,
  };
};
