import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FormErrorBanner, InputNumber, Select, FormView, FormVariant } from '../base';
import { WalletTransferForm, walletTransferFormSchema } from '../../../domain';
import { Button, Spinner } from 'tamagui';

const walletTransferFormResolver = zodResolver(walletTransferFormSchema);

export type WalletTransferFormViewProps = {
  variant: FormVariant;
  defaultValues: WalletTransferForm;
  onSubmit: (values: WalletTransferForm) => void;
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const WalletTransferFormView = (props: WalletTransferFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={walletTransferFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Wallets..."
    errorTitle="Failed to Fetch Wallets"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Field name="toWalletId" label="Transfer To">
          <Select items={props.walletSelectOptions} />
        </Field>
        <Field name="amount" label="Amount">
          <InputNumber />
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
