import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
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
  const { formik } = useWalletFormState({ variant, onSuccess });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="balance" label="Balance">
          <InputNumber />
        </Field>
        <Field name="costPercentage" label="Cost Percentage">
          <InputNumber />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
