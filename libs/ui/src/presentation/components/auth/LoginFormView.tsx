import { Field, FormErrorBanner, InputText } from '../base';
import { AuthLoginForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, Spinner } from 'tamagui';

export type LoginFormProps = {
  form: UseFormReturn<AuthLoginForm>;
  onSubmit: (values: AuthLoginForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const LoginForm = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: LoginFormProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="username" label="Username">
          <InputText />
        </Field>
        <Field name="password" label="Password">
          <InputText secureTextEntry />
        </Field>
        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
