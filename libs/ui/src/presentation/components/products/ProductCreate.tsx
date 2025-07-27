import {
  Field,
  InputText,
  InputNumber,
  Select,
  LoadingView,
  ErrorView,
  MarkdownEditor,
} from '../base';
import { Button, Card, Form, XStack } from 'tamagui';
import { ProductForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type ProductCreateProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<ProductForm>;
  onSubmit: (values: ProductForm) => void;
  categorySelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
};

export const ProductCreate = ({
  variant,
  onRetryButtonPress,
  form,
  onSubmit,
  categorySelectOptions,
  isSubmitDisabled,
}: ProductCreateProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Card>
          <Card.Header>
            <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
              <Field name="name" label="Name" flex={1}>
                <InputText />
              </Field>
              <Field name="categoryId" label="Category" flex={1}>
                <Select items={categorySelectOptions} />
              </Field>
              <Field name="price" label="Price" flex={1}>
                <InputNumber min={0} />
              </Field>
            </XStack>
          </Card.Header>
        </Card>

        <MarkdownEditor name="description" defaultMode="edit" />

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
    <LoadingView title="Fetching Product..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Product"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
