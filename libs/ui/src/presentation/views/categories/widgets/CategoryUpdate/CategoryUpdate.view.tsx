import { Field, InputText, LoadingView, ErrorView } from '../../../base';
import { CategoryForm } from '../../../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type CategoryUpdateViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<CategoryForm>;
  onSubmit: (values: CategoryForm) => void;
  isSubmitDisabled: boolean;
};

export const CategoryUpdateView = ({
  variant,
  onRetryButtonPress,
  form,
  onSubmit,
  isSubmitDisabled,
}: CategoryUpdateViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
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
