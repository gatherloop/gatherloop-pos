import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
  LoadingView,
  ErrorView,
} from '../../../base';
import {
  UseWalletFormStateProps,
  useWalletFormState,
} from './WalletForm.state';

export type WalletFormProps = {
  variant: UseWalletFormStateProps['variant'];
  onSuccess: () => void;
};

export const WalletForm = ({ variant, onSuccess }: WalletFormProps) => {
  const { formik, isSubmitDisabled, wallet } = useWalletFormState({
    variant,
    onSuccess,
  });
  return wallet.status === 'success' || variant.type === 'create' ? (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="balance" label="Balance">
          <InputNumber />
        </Field>
        <Field name="paymentCostPercentage" label="Payment Cost Percentage">
          <InputNumber fractionDigit={2} />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  ) : wallet.status === 'pending' ? (
    <LoadingView title="Fetching Wallet..." />
  ) : (
    <ErrorView
      title="Failed to Fetch Wallet"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={wallet.refetch}
    />
  );
};
