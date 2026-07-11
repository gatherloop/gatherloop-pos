import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  LoadingView,
  ErrorView,
} from '../base';
import { BudgetForm } from '../../../domain';
import { Button, Form, Spinner } from 'tamagui';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type BudgetFormViewProps = {
  variant:
    | { type: 'loaded' }
    | { type: 'loading' }
    | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<BudgetForm>;
  onSubmit: (values: BudgetForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const BudgetFormView = ({
  variant,
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: BudgetFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="percentage" label="Target %">
          <InputNumber min={0} max={100} fractionDigit={2} />
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
    <LoadingView title="Fetching Budget..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Budget"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={variant.onRetryButtonPress}
    />
  ) : null;
};
