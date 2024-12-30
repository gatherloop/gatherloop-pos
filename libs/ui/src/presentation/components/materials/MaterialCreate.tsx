import { Field, InputText, InputNumber, MarkdownEditor } from '../base';
import { MaterialForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type MaterialCreateProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
};

export const MaterialCreate = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: MaterialCreateProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="price" label="Price">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="unit" label="Unit">
          <InputText />
        </Field>
        <Field name="description" label="Description">
          <MarkdownEditor defaultMode="edit" />
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
