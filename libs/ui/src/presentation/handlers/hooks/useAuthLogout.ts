import { AuthLogoutUsecase } from '../../../domain';
import { useUsecase } from './useUsecase';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useRouter } from 'solito/router';

export const useAuthLogout = (usecase: AuthLogoutUsecase) => {
  const { state, dispatch } = useUsecase(usecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'loaded') {
      toast.show('Logout Success');
      router.push('/auth/login');
    }
  }, [toast, state.type, router]);

  return {
    state,
    dispatch,
  };
};
