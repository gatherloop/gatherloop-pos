import { Card, H2, Paragraph, ScrollView } from 'tamagui';
import { LoginForm } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useAuthLoginController } from '../controllers';
import { AuthLoginUsecase } from '../../domain';

export type AuthLoginScreenProps = {
  authLoginUsecase: AuthLoginUsecase;
};

export const AuthLoginScreen = (props: AuthLoginScreenProps) => {
  const controller = useAuthLoginController(props.authLoginUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/');
  }, [controller.state.type, router]);

  return (
    <ScrollView padding="$3" justifyContent="center" alignItems="center">
      <Card elevate size="$4" bordered {...props}>
        <Card.Header padded>
          <H2>Login</H2>
          <Paragraph theme="alt2">
            Input username and password to login into POS system
          </Paragraph>
          <LoginForm {...controller} />
        </Card.Header>
      </Card>
    </ScrollView>
  );
};
