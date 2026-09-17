import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, FormView, FormVariant } from '../base';
import { KdsDeviceForm, kdsDeviceFormSchema } from '../../../../domain';

const kdsDeviceFormResolver = zodResolver(kdsDeviceFormSchema);

export type KdsDeviceSetupFormProps = {
  variant: FormVariant;
  defaultValues: KdsDeviceForm;
  onSubmit: (values: KdsDeviceForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const KdsDeviceSetupForm = (props: KdsDeviceSetupFormProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={kdsDeviceFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Loading Device Setup Form..."
    errorTitle="Failed to Load Device Setup Form"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="name" label="Device Name">
          <InputText placeholder="e.g. Andi's phone" />
        </Field>
        <Button
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Grant Permission &amp; Register
        </Button>
      </>
    )}
  </FormView>
);
