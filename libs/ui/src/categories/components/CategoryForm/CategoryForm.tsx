import { FormikProvider } from 'formik';
import { Field, Form, InputText, SubmitButton } from '../../../base';
import {
  UseCategoryFormStateProps,
  useCategoryFormState,
} from './CategoryForm.state';

export type CategoryFormProps = {
  variant: UseCategoryFormStateProps['variant'];
  onSuccess: () => void;
};

export const CategoryForm = ({ variant, onSuccess }: CategoryFormProps) => {
  const { formik } = useCategoryFormState({ variant, onSuccess });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
