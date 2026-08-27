import { AuthLoginUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useAuthLoginController = (usecase: AuthLoginUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Login Success');
  }, [toast, state.type]);

  return {
    state,
    dispatch,
  };
};
