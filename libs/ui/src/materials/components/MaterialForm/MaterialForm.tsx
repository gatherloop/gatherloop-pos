import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
  LoadingView,
  ErrorView,
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
  const { formik, isSubmitDisabled, material } = useMaterialFormState({
    variant,
    onSuccess,
  });

  return material.status === 'success' || variant.type === 'create' ? (
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
  ) : material.status === 'pending' ? (
    <LoadingView title="Fetching Material..." />
  ) : (
    <ErrorView
      title="Failed to Fetch Material"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={material.refetch}
    />
  );
};
