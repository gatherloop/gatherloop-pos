import { Field, InputText } from '../base';
import { SupplierForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type SupplierFormViewProps = {
  form: UseFormReturn<SupplierForm>;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
};

export const SupplierFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: SupplierFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="phone" label="Phone">
          <InputText />
        </Field>
        <Field name="address" label="Address">
          <InputText />
        </Field>
        <Field name="mapsLink" label="Maps Link">
          <InputText />
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
