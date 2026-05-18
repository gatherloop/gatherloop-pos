import { useState } from 'react';
import { FormProvider, useFieldArray, UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  Input,
  Label,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { FormErrorBanner, InputNumber } from '../base';
import { StockCheckForm } from '../../../domain';
import { createDebounce } from '../../../utils';

const changeQueryDebounce = createDebounce();

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
  const [query, setQuery] = useState('');

  const lowerQuery = query.toLowerCase();
  const matchCount = lowerQuery
    ? fields.filter((f) => f.materialName.toLowerCase().includes(lowerQuery))
        .length
    : fields.length;
  const hasQuery = query.length > 0;
  const noMatches = hasQuery && matchCount === 0;

  const handleChange = (value: string) => {
    changeQueryDebounce(() => setQuery(value), 400);
  };

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />

        <XStack
          alignItems="center"
          gap="$2"
          position="sticky"
          top={0}
          zIndex={10}
          backgroundColor="$background"
          paddingVertical="$2"
        >
          <Input
            flex={1}
            placeholder="Search material by name"
            onChangeText={handleChange}
          />
          {hasQuery && (
            <Button
              icon={X}
              circular
              size="$2"
              onPress={() => {
                handleChange('');
              }}
              accessibilityLabel="Clear search"
            />
          )}
        </XStack>

        <YStack maxWidth={640} alignSelf="center" width="100%">
          {noMatches && (
            <SizableText
              color="$gray10"
              textAlign="center"
              paddingVertical="$4"
            >
              No materials match &quot;{query}&quot;
            </SizableText>
          )}

          {fields.map((field, index) => {
            const inputId = `stock-check-item-${field.id}`;
            const hidden =
              hasQuery &&
              !field.materialName.toLowerCase().includes(lowerQuery);
            return (
              <XStack
                key={field.id}
                gap="$2"
                alignItems="center"
                paddingVertical="$2"
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                display={hidden ? 'none' : 'flex'}
              >
                <Label flex={1} numberOfLines={1} htmlFor={inputId}>
                  {field.materialName}
                </Label>
                <InputNumber
                  name={`items.${index}.currentStock`}
                  width={100}
                  id={inputId}
                />
                <SizableText width={60} color="$gray10">
                  {field.purchaseUnit}
                </SizableText>
              </XStack>
            );
          })}
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
