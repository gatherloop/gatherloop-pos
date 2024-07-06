import { FormikProvider } from 'formik';
import { Field, Form, Input, SubmitButton } from '../../../base';
import { useCategoryFormState } from './state';

export const CategoryForm = () => {
  const { formik } = useCategoryFormState();
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <Input />
        </Field>
        <Field name="description" label="Description">
          <Input />
        </Field>
        <Field name="imageUrl" label="Image URL">
          <Input />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
