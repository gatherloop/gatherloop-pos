import { useRouter } from 'solito/router';
import { AuthLoginUsecase } from '../../domain';
import { useAuthLoginController } from '../controllers';
import { useEffect } from 'react';
import { AuthLoginScreen } from './AuthLoginScreen';

export type AuthLoginHandlerProps = {
  authLoginUsecase: AuthLoginUsecase;
};

export const AuthLoginHandler = (props: AuthLoginHandlerProps) => {
  const authLoginController = useAuthLoginController(props.authLoginUsecase);
  const router = useRouter();

  useEffect(() => {
    if (authLoginController.state.type === 'submitSuccess') router.push('/');
  }, [authLoginController.state.type, router]);

  return (
    <AuthLoginScreen
      form={authLoginController.form}
      isSubmitDisabled={
        authLoginController.state.type === 'submitting' ||
        authLoginController.state.type === 'submitError' ||
        authLoginController.state.type === 'submitSuccess'
      }
      isSubmitting={authLoginController.state.type === 'submitting'}
      serverError={
        authLoginController.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => {
        authLoginController.dispatch({ type: 'SUBMIT', values });
      }}
    />
  );
};
