import { FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
  LoadingView,
  ErrorView,
} from '../../../base';
import { MaterialForm } from '../../../../../domain';

export type MaterialUpdateViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  formik: FormikContextType<MaterialForm>;
  isSubmitDisabled: boolean;
};

export const MaterialUpdateView = ({
  variant,
  onRetryButtonPress,
  formik,
  isSubmitDisabled,
}: MaterialUpdateViewProps) => {
  return variant.type === 'loaded' ? (
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
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Material..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Material"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
