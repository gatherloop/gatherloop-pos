import { Field, InputNumber, Select } from '../../../base';
import { WalletTransferForm } from '../../../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type WalletTransferCreateViewProps = {
  form: UseFormReturn<WalletTransferForm>;
  onSubmit: (values: WalletTransferForm) => void;
  walletSelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
};

export const WalletTransferCreateView = ({
  form,
  onSubmit,
  walletSelectOptions,
  isSubmitDisabled,
}: WalletTransferCreateViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
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
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
