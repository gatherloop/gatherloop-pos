import { Field, InputText, LoadingView, ErrorView, Select } from '../base';
import { TransactionCategoryForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, XStack } from 'tamagui';

export type TransactionCategoryFormViewProps = {
  variant:
    | { type: 'loaded' }
    | { type: 'loading' }
    | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<TransactionCategoryForm>;
  productSelectOptions: { label: string; value: number }[];
  onSubmit: (values: TransactionCategoryForm) => void;
  isSubmitDisabled: boolean;
};

export const TransactionCategoryFormView = ({
  variant,
  form,
  productSelectOptions,
  onSubmit,
  isSubmitDisabled,
}: TransactionCategoryFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <XStack gap="$3">
          <Field name="name" label="Name" flex={1}>
            <InputText />
          </Field>
          <Field name="checkoutProductId" label="Checkout Product" flex={1}>
            <Select items={productSelectOptions} />
          </Field>
        </XStack>

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
      onRetryButtonPress={variant.onRetryButtonPress}
    />
  ) : null;
};
