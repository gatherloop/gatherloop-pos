import { FormProvider, useFieldArray, UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  Input,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { FormErrorBanner, InputNumber } from '../base';
import { StockCheckForm } from '../../../domain';
import { Controller } from 'react-hook-form';

export type StockCheckFormViewProps = {
  form: UseFormReturn<StockCheckForm>;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const StockCheckFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: StockCheckFormViewProps) => {
  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />

        <YStack gap="$2">
          {fields.map((field, index) => (
            <XStack key={field.id} gap="$2" alignItems="center">
              <SizableText flex={1} numberOfLines={1}>
                {field.materialName}
              </SizableText>
              <InputNumber name={`items.${index}.currentStock`} width={100} />
              <SizableText width={60} color="$gray10">
                {field.purchaseUnit}
              </SizableText>
            </XStack>
          ))}
        </YStack>

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
