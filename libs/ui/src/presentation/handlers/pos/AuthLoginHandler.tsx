import { useRouter } from 'solito/router';
import { AuthLoginUsecase } from '../../../domain';
import { useController } from '../../controllers/controller';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { AuthLoginScreen } from '../../screens/pos/AuthLoginScreen';

export type AuthLoginHandlerProps = {
  authLoginUsecase: AuthLoginUsecase;
};

export const AuthLoginHandler = (props: AuthLoginHandlerProps) => {
  const { state, dispatch } = useController(props.authLoginUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (state.type === 'submitSuccess') {
      toast.show('Login Success');
      router.push('/');
    }
  }, [state.type, toast, router]);

  return (
    <AuthLoginScreen
      defaultValues={state.values}
      isSubmitDisabled={
        state.type === 'submitting' || state.type === 'submitSuccess'
      }
      isSubmitting={state.type === 'submitting'}
      serverError={
        state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => {
        dispatch({ type: 'SUBMIT', values });
      }}
      variant={{ type: 'loaded' }}
    />
  );
};
