import { Card, H2, Paragraph, ScrollView } from 'tamagui';
import { LoginForm } from '../components';
import { AuthLoginForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type AuthLoginScreenProps = {
  form: UseFormReturn<AuthLoginForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: AuthLoginForm) => void;
  serverError?: string;
};

export const AuthLoginScreen = (props: AuthLoginScreenProps) => {
  return (
    <ScrollView padding="$3" justifyContent="center" alignItems="center">
      <Card elevate size="$4" bordered>
        <Card.Header padded>
          <H2>Login</H2>
          <Paragraph theme="alt2">
            Input username and password to login into POS system
          </Paragraph>
          <LoginForm
            form={props.form}
            isSubmitDisabled={props.isSubmitDisabled}
            isSubmitting={props.isSubmitting}
            onSubmit={props.onSubmit}
            serverError={props.serverError}
          />
        </Card.Header>
      </Card>
    </ScrollView>
  );
};
