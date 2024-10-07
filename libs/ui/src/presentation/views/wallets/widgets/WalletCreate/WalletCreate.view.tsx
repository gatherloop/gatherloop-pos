import { FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
} from '../../../base';
import { WalletForm } from '../../../../../domain';

export type WalletCreateViewProps = {
  formik: FormikContextType<WalletForm>;
  isSubmitDisabled: boolean;
};

export const WalletCreateView = ({
  formik,
  isSubmitDisabled,
}: WalletCreateViewProps) => {
  return (
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
  );
};
