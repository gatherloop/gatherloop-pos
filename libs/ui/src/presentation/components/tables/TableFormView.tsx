import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, InputNumber, FormView, FormVariant } from '../base';
import { TableForm, tableFormSchema } from '../../../domain';

const tableFormResolver = zodResolver(tableFormSchema);

export type TableFormViewProps = {
  variant: FormVariant;
  defaultValues: TableForm;
  onSubmit: (values: TableForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const TableFormView = (props: TableFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={tableFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Table..."
    errorTitle="Failed to Fetch Table"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="label" label="Label">
          <InputText />
        </Field>
        <Field name="floorNumber" label="Floor Number">
          <InputNumber fractionDigit={0} min={1} />
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
