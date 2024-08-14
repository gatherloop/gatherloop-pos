import { FormikProvider } from 'formik';
import { useWalletTransferFormState } from './WalletTransferForm.state';
import { Field, Form, InputNumber, Select, SubmitButton } from '../../../base';

export type WalletTransferFormProps = {
  walletId: number;
  onSuccess?: () => void;
};

export const WalletTransferForm = ({
  walletId,
  onSuccess,
}: WalletTransferFormProps) => {
  const { wallets, formik, isSubmitDisabled } = useWalletTransferFormState({
    walletId,
    onSuccess,
  });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="toWalletId" label="Transfer To">
          <Select
            items={wallets.map((wallet) => ({
              label: wallet.name,
              value: String(wallet.id),
            }))}
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
