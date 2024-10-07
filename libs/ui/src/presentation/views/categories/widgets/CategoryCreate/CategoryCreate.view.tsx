import { FormikContextType, FormikProvider } from 'formik';
import { Field, Form, InputText, SubmitButton } from '../../../base';
import { CategoryForm } from '../../../../../domain';

export type CategoryCreateViewProps = {
  formik: FormikContextType<CategoryForm>;
  isSubmitDisabled: boolean;
};

export const CategoryCreateView = ({
  formik,
  isSubmitDisabled,
}: CategoryCreateViewProps) => {
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
