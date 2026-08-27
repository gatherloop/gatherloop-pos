import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, FormView, FormVariant } from '../base';
import { SupplierForm, supplierFormSchema } from '../../../domain';

const supplierFormResolver = zodResolver(supplierFormSchema);

export type SupplierFormViewProps = {
  variant: FormVariant;
  defaultValues: SupplierForm;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const SupplierFormView = (props: SupplierFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={supplierFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Supplier..."
    errorTitle="Failed to Fetch Supplier"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
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
