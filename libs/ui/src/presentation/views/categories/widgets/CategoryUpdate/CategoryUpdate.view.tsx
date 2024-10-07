import { FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  SubmitButton,
  LoadingView,
  ErrorView,
} from '../../../base';
import { CategoryForm } from '../../../../../domain';

export type CategoryUpdateViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  formik: FormikContextType<CategoryForm>;
  isSubmitDisabled: boolean;
};

export const CategoryUpdateView = ({
  variant,
  onRetryButtonPress,
  formik,
  isSubmitDisabled,
}: CategoryUpdateViewProps) => {
  return variant.type === 'loaded' ? (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Category..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Category"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
