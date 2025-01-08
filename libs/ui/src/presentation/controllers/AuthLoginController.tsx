import { useForm } from 'react-hook-form';
import { AuthLoginForm, AuthLoginUsecase } from '../../domain';
import { useController } from './controller';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';

export const useAuthLoginController = (usecase: AuthLoginUsecase) => {
  const { state, dispatch } = useController(usecase);

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') toast.show('Login Success');
    else if (state.type === 'submitError') toast.show('Login Error');
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({ username: z.string().min(1), password: z.string().min(1) })
    ),
  });

  const onSubmit = (values: AuthLoginForm) => {
    dispatch({ type: 'SUBMIT', values });
  };

  const isSubmitDisabled =
    state.type === 'submitting' ||
    state.type === 'submitError' ||
    state.type === 'submitSuccess';

  return {
    state,
    dispatch,
    form,
    onSubmit,
    isSubmitDisabled,
  };
};
