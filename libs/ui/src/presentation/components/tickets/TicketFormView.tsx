import {
  Field,
  FormErrorBanner,
  InputText,
  LoadingView,
  ErrorView,
} from '../base';
import { TicketForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, Spinner } from 'tamagui';

export type TicketFormViewProps = {
  variant:
    | { type: 'loaded' }
    | { type: 'loading' }
    | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<TicketForm>;
  onSubmit: (values: TicketForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const TicketFormView = ({
  variant,
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: TicketFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="code" label="Code">
          <InputText />
        </Field>
        <Field name="name" label="Name">
          <InputText />
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
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Ticket..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Ticket"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={variant.onRetryButtonPress}
    />
  ) : null;
};
