import { Field, InputText, InputNumber } from '../../../base';
import { WalletForm } from '../../../../../domain';
import { Button, Form } from 'tamagui';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type WalletCreateViewProps = {
  form: UseFormReturn<WalletForm>;
  onSubmit: (values: WalletForm) => void;
  isSubmitDisabled: boolean;
};

export const WalletCreateView = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: WalletCreateViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="balance" label="Balance">
          <InputNumber />
        </Field>
        <Field name="paymentCostPercentage" label="Payment Cost Percentage">
          <InputNumber fractionDigit={2} />
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
