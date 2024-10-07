import { FormikContextType, FormikProvider } from 'formik';
import { Field, Form, InputNumber, Select, SubmitButton } from '../../../base';
import { WalletTransferForm } from '../../../../../domain';

export type WalletTransferCreateViewProps = {
  formik: FormikContextType<WalletTransferForm>;
  walletSelectOptions: { label: string; value: string }[];
  isSubmitDisabled: boolean;
};

export const WalletTransferCreateView = ({
  formik,
  walletSelectOptions,
  isSubmitDisabled,
}: WalletTransferCreateViewProps) => {
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="toWalletId" label="Transfer To">
          <Select
            items={walletSelectOptions}
            parseInputToFieldValue={parseInt}
            parseFieldToInputValue={String}
          />
        </Field>
        <Field name="amount" label="Amount">
          <InputNumber />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
