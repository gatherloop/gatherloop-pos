import { FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
} from '../../../base';
import { MaterialForm } from '../../../../../domain';

export type MaterialCreateViewProps = {
  formik: FormikContextType<MaterialForm>;
  isSubmitDisabled: boolean;
};

export const MaterialCreateView = ({
  formik,
  isSubmitDisabled,
}: MaterialCreateViewProps) => {
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="price" label="Price">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="unit" label="Unit">
          <InputText />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
