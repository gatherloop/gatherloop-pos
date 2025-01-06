import { Field, InputText } from '../base';
import { AuthLoginForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type LoginFormProps = {
  form: UseFormReturn<AuthLoginForm>;
  onSubmit: (values: AuthLoginForm) => void;
  isSubmitDisabled: boolean;
};

export const LoginForm = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: LoginFormProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
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
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
