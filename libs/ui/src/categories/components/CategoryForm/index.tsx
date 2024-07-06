import { FormikProvider } from 'formik';
import { Field, Form, Input, SubmitButton } from '../../../base';
import { UseCategoryFormStateProps, useCategoryFormState } from './state';

export type CategoryFormProps = {
  variant: UseCategoryFormStateProps['variant'];
};

export const CategoryForm = ({ variant }: CategoryFormProps) => {
  const { formik } = useCategoryFormState({ variant });
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
