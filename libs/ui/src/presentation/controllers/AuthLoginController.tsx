import { useForm } from 'react-hook-form';
import { AuthLoginUsecase } from '../../domain';
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
  }, [toast, state.type]);

  const form = useForm({
    defaultValues: state.values,
    resolver: zodResolver(
      z.object({ username: z.string().min(1), password: z.string().min(1) })
    ),
  });

  return {
    state,
    dispatch,
    form,
  };
};
