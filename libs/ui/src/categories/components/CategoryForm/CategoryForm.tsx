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
  const { formik, isSubmitDisabled } = useCategoryFormState({
    variant,
    onSuccess,
  });
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
