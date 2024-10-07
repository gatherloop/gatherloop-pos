import { FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
  LoadingView,
  ErrorView,
} from '../../../base';
import { WalletForm } from '../../../../../domain';

export type WalletUpdateViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  formik: FormikContextType<WalletForm>;
  isSubmitDisabled: boolean;
};

export const WalletUpdateView = ({
  variant,
  onRetryButtonPress,
  formik,
  isSubmitDisabled,
}: WalletUpdateViewProps) => {
  return variant.type === 'loaded' ? (
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
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Wallet..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Wallet"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
