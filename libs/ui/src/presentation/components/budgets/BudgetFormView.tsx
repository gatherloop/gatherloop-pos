import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  FormView,
  FormVariant,
} from '../base';
import { BudgetForm, budgetFormSchema } from '../../../domain';

const budgetFormResolver = zodResolver(budgetFormSchema);

export type BudgetFormViewProps = {
  variant: FormVariant;
  defaultValues: BudgetForm;
  onSubmit: (values: BudgetForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const BudgetFormView = (props: BudgetFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={budgetFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Budget..."
    errorTitle="Failed to Fetch Budget"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="percentage" label="Target %">
          <InputNumber min={0} max={100} fractionDigit={2} />
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
