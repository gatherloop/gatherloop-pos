import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Paragraph, Spinner } from 'tamagui';
import {
  Field,
  FormErrorBanner,
  InputNumber,
  InputText,
  Switch,
  FormView,
  FormVariant,
} from '../base';
import { WalletForm, walletFormSchema } from '../../../domain';

const walletFormResolver = zodResolver(walletFormSchema);

export type WalletFormViewProps = {
  variant: FormVariant;
  defaultValues: WalletForm;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const WalletFormView = (props: WalletFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={walletFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Wallet..."
    errorTitle="Failed to Fetch Wallet"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
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
        <Field name="isPaymentTarget" label="Can receive transaction payments">
          <Switch />
          <Paragraph size="$2" color="$gray10">
            Turn this off for internal wallets (e.g. a safe or holding account) that should not appear in the checkout payment modal.
          </Paragraph>
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
