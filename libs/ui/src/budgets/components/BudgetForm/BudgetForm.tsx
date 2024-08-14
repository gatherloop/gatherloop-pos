import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
} from '../../../base';
import {
  UseBudgetFormStateProps,
  useBudgetFormState,
} from './BudgetForm.state';

export type BudgetFormProps = {
  variant: UseBudgetFormStateProps['variant'];
  onSuccess: () => void;
};

export const BudgetForm = ({ variant, onSuccess }: BudgetFormProps) => {
  const { formik,isSubmitDisabled } = useBudgetFormState({ variant, onSuccess });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="percentage" label="Percentage">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="balance" label="Balance">
          <InputNumber fractionDigit={2} />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
