import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  LoadingView,
  ErrorView,
  Switch,
} from '../base';
import { WalletForm } from '../../../domain';
import { Button, Form, Spinner } from 'tamagui';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type WalletFormViewProps = {
  variant:
    | { type: 'loaded' }
    | { type: 'loading' }
    | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<WalletForm>;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const WalletFormView = ({
  variant,
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: WalletFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="balance" label="Balance">
          <InputNumber />
        </Field>
        <Field name="paymentCostPercentage" label="Payment Cost Percentage">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="isCashless" label="Cashless">
          <Switch />
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
    <LoadingView title="Fetching Wallet..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Wallet"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={variant.onRetryButtonPress}
    />
  ) : null;
};
