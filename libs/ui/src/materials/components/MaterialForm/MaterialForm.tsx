import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
} from '../../../base';
import {
  UseMaterialFormStateProps,
  useMaterialFormState,
} from './MaterialForm.state';

export type MaterialFormProps = {
  variant: UseMaterialFormStateProps['variant'];
  onSuccess: () => void;
};

export const MaterialForm = ({ variant, onSuccess }: MaterialFormProps) => {
  const { formik } = useMaterialFormState({ variant, onSuccess });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="price" label="Price">
          <InputNumber />
        </Field>
        <Field name="unit" label="Unit">
          <InputText />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
