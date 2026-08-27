import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, FormView, FormVariant } from '../base';
import { TicketForm, ticketFormSchema } from '../../../domain';

const ticketFormResolver = zodResolver(ticketFormSchema);

export type TicketFormViewProps = {
  variant: FormVariant;
  defaultValues: TicketForm;
  onSubmit: (values: TicketForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const TicketFormView = (props: TicketFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={ticketFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Ticket..."
    errorTitle="Failed to Fetch Ticket"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="code" label="Code">
          <InputText />
        </Field>
        <Field name="name" label="Name">
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
