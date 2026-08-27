import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import { Field, FormErrorBanner, InputText, Select, FormView, FormVariant } from '../base';
import { CategoryForm, categoryFormSchema } from '../../../domain';

const categoryFormResolver = zodResolver(categoryFormSchema);

export type CategoryFormViewProps = {
  variant: FormVariant;
  defaultValues: CategoryForm;
  onSubmit: (values: CategoryForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const CategoryFormView = (props: CategoryFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={categoryFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Category..."
    errorTitle="Failed to Fetch Category"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="station" label="Station">
          <Select
            items={[
              { label: 'Kitchen', value: 'KITCHEN' },
              { label: 'Bar', value: 'BAR' },
              { label: 'None', value: 'NONE' },
            ]}
          />
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
