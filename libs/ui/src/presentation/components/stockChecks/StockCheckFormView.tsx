import { useEffect, useState } from 'react';
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
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const lowerQuery = query.toLowerCase();
  const matchCount = lowerQuery
    ? fields.filter((f) => f.materialName.toLowerCase().includes(lowerQuery))
        .length
    : fields.length;
  const hasQuery = query.length > 0;
  const hasInputValue = inputValue.length > 0;
  const noMatches = hasQuery && matchCount === 0;

  // FR-3: if submit surfaces errors on rows hidden by the filter, clear the
  // filter so the user can see the offending row.
  const errors = form.formState.errors;
  useEffect(() => {
    if (!hasInputValue) return;
    const itemErrors = errors.items;
    if (!itemErrors) return;
    const errorIndexes = Object.keys(itemErrors).map(Number);
    const hasHiddenError = errorIndexes.some((i) => {
      const name = fields[i]?.materialName ?? '';
      return !name.toLowerCase().includes(lowerQuery);
    });
    if (hasHiddenError) {
      setInputValue('');
      setQuery('');
    }
  }, [errors]);

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />

        {/* Sticky search bar */}
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
            value={inputValue}
            onChangeText={setInputValue}
          />
          {hasInputValue && (
            <SizableText color="$gray10" flexShrink={0}>
              {matchCount}/{fields.length}
            </SizableText>
          )}
          {hasInputValue && (
            <Button
              icon={X}
              circular
              size="$2"
              onPress={() => {
                setInputValue('');
                setQuery('');
              }}
              accessibilityLabel="Clear search"
            />
          )}
        </XStack>

        <YStack maxWidth={640} alignSelf="center" width="100%">
          {noMatches && (
            <SizableText color="$gray10" textAlign="center" paddingVertical="$4">
              No materials match &quot;{inputValue}&quot;
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
