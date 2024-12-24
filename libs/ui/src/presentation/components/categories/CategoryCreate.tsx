import { Field, InputText } from '../base';
import { CategoryForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type CategoryCreateProps = {
  form: UseFormReturn<CategoryForm>;
  onSubmit: (values: CategoryForm) => void;
  isSubmitDisabled: boolean;
};

export const CategoryCreate = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: CategoryCreateProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="name" label="Name">
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
