import { Field, FormErrorBanner, InputNumber, Select } from '../base';
import { WalletTransferForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, Spinner } from 'tamagui';

export type WalletTransferFormViewProps = {
  form: UseFormReturn<WalletTransferForm>;
  onSubmit: (values: WalletTransferForm) => void;
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const WalletTransferFormView = ({
  form,
  onSubmit,
  walletSelectOptions,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: WalletTransferFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="toWalletId" label="Transfer To">
          <Select items={walletSelectOptions} />
        </Field>
        <Field name="amount" label="Amount">
          <InputNumber />
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
  );
};
