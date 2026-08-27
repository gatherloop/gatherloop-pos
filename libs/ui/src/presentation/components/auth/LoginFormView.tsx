import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, FormView, FormVariant } from '../base';
import { AuthLoginForm, authLoginFormSchema } from '../../../domain';

const authLoginFormResolver = zodResolver(authLoginFormSchema);

export type LoginFormProps = {
  variant: FormVariant;
  defaultValues: AuthLoginForm;
  onSubmit: (values: AuthLoginForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const LoginForm = (props: LoginFormProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={authLoginFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Loading Login Form..."
    errorTitle="Failed to Load Login Form"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="username" label="Username">
          <InputText />
        </Field>
        <Field name="password" label="Password">
          <InputText secureTextEntry />
        </Field>
        <Button
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
