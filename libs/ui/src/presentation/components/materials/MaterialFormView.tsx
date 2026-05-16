import { Field, FormErrorBanner, InputText, InputNumber, MarkdownEditor } from '../base';
import { MaterialForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, SizableText, Spinner } from 'tamagui';

export type MaterialFormViewProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const MaterialFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: MaterialFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="price" label="Price">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="unit" label="Unit">
          <InputText />
        </Field>
        <Field name="purchaseUnit" label="Purchase Unit">
          <InputText placeholder="e.g. Kg, Box, Bottle" />
        </Field>
        <Field name="purchaseUnitSize" label="Purchase Unit Size">
          <SizableText size="$2" color="$gray10">
            How many recipe units are in 1 purchase unit (e.g. 1000 if unit=Gram and purchase unit=Kg)
          </SizableText>
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="minimumStock" label="Minimum Stock (purchase units)">
          <InputNumber fractionDigit={0} />
        </Field>
        <Field name="normalStock" label="Normal Stock (purchase units)">
          <InputNumber fractionDigit={0} />
        </Field>
        <Field name="description" label="Description">
          <MarkdownEditor
            defaultMode={form.getValues('description') ? 'preview' : 'edit'}
          />
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
