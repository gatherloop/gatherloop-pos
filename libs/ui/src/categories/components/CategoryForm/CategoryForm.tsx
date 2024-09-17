import { FormikProvider } from 'formik';
import {
  ErrorView,
  Field,
  Form,
  InputText,
  LoadingView,
  SubmitButton,
} from '../../../base';
import {
  UseCategoryFormStateProps,
  useCategoryFormState,
} from './CategoryForm.state';

export type CategoryFormProps = {
  variant: UseCategoryFormStateProps['variant'];
  onSuccess: () => void;
};

export const CategoryForm = ({ variant, onSuccess }: CategoryFormProps) => {
  const { formik, isSubmitDisabled, category } = useCategoryFormState({
    variant,
    onSuccess,
  });

  return category.status === 'success' || variant.type === 'create' ? (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  ) : category.status === 'pending' ? (
    <LoadingView title="Fetching Category..." />
  ) : (
    <ErrorView
      title="Failed to Fetch Category"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={category.refetch}
    />
  );
};
