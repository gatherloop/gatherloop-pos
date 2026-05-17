import { useState } from 'react';
import { FormProvider, useFieldArray, UseFormReturn } from 'react-hook-form';
import { Button, Form, Input, SizableText, Spinner, XStack, YStack, Card } from 'tamagui';
import { FormErrorBanner } from '../base';
import { StockCheckForm } from '../../../domain';
import { Controller } from 'react-hook-form';
import { Search } from '@tamagui/lucide-icons';

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
  const [search, setSearch] = useState('');

  const filteredIndices = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) =>
      field.materialName.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />

        <XStack
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$3"
          paddingHorizontal="$3"
          alignItems="center"
          gap="$2"
          backgroundColor="$background"
        >
          <Search size={16} color="$gray10" />
          <Input
            flex={1}
            borderWidth={0}
            placeholder="Search material..."
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </XStack>

        {filteredIndices.length === 0 ? (
          <SizableText color="$gray10" textAlign="center" paddingVertical="$4">
            No materials match your search
          </SizableText>
        ) : (
          <XStack flexWrap="wrap" gap="$2">
            {filteredIndices.map(({ field, index }) => (
              <Card
                key={field.id}
                bordered
                padding="$3"
                gap="$2"
                width="48%"
                $gtSm={{ width: '31%' }}
                $gtMd={{ width: '23%' }}
              >
                <SizableText size="$3" numberOfLines={2} color="$gray12">
                  {field.materialName}
                </SizableText>
                <XStack alignItems="center" gap="$2">
                  <Controller
                    control={form.control}
                    name={`items.${index}.currentStock`}
                    render={({ field: { value, onChange } }) => (
                      <Input
                        flex={1}
                        keyboardType="numeric"
                        value={value.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text, 10);
                          onChange(isNaN(num) ? 0 : num);
                        }}
                        textAlign="right"
                      />
                    )}
                  />
                  <SizableText size="$2" color="$gray10" numberOfLines={1}>
                    {field.purchaseUnit}
                  </SizableText>
                </XStack>
              </Card>
            ))}
          </XStack>
        )}

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
