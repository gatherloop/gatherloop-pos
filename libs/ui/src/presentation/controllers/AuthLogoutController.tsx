import { AuthLogoutUsecase } from '../../domain';
import { useController } from './controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useRouter } from 'solito/router';

export const useAuthLogoutController = (usecase: AuthLogoutUsecase) => {
  const { state, dispatch } = useController(usecase);
  const router = useRouter();

  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'loaded') {
      toast.show('Logout Success');
      router.push('/auth/login');
    }
  }, [toast, state.type, router]);

  const onLogoutPress = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const isLoading = state.type === 'loading';

  return {
    state,
    dispatch,
    isLoading,
    onLogoutPress,
  };
};
