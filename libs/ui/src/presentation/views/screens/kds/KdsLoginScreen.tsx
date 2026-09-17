import { Card, H2, Paragraph, ScrollView } from 'tamagui';
import { LoginForm, LoginFormProps } from '../../components';
import { AuthLoginForm } from '../../../../domain';

export type KdsLoginScreenProps = {
  defaultValues: AuthLoginForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: AuthLoginForm) => void;
  variant: LoginFormProps['variant'];
  serverError?: string;
};

export const KdsLoginScreen = (props: KdsLoginScreenProps) => {
  return (
    <ScrollView
      padding="$3"
      contentContainerStyle={{
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <Card elevate size="$4" bordered>
        <Card.Header padded gap="$3">
          <H2>Login</H2>
          <Paragraph theme="alt2">
            Input username and password to login into the Kitchen Display
            System
          </Paragraph>
          <LoginForm
            defaultValues={props.defaultValues}
            isSubmitDisabled={props.isSubmitDisabled}
            isSubmitting={props.isSubmitting}
            onSubmit={props.onSubmit}
            variant={props.variant}
            serverError={props.serverError}
          />
        </Card.Header>
      </Card>
    </ScrollView>
  );
};
