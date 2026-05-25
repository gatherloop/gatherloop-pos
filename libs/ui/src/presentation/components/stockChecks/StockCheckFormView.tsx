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
import { Filter, X } from '@tamagui/lucide-icons';
import { FormErrorBanner, InputNumber } from '../base';
import { StockCheckForm } from '../../../domain';

export type StockCheckFormViewProps = {
  form: UseFormReturn<StockCheckForm>;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
  query: string;
  onQueryChange: (value: string) => void;
  showOnlyPending: boolean;
  onShowOnlyPendingToggle: () => void;
  filled: number;
  total: number;
  pendingRows: boolean[];
};

export const StockCheckFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
  query,
  onQueryChange,
  showOnlyPending,
  onShowOnlyPendingToggle,
  filled,
  total,
  pendingRows,
}: StockCheckFormViewProps) => {
  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  const lowerQuery = query.toLowerCase();
  const matchCount = lowerQuery
    ? fields.filter((f) => f.materialName.toLowerCase().includes(lowerQuery))
        .length
    : fields.length;
  const hasQuery = query.length > 0;
  const noMatches = hasQuery && matchCount === 0;

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />

        <XStack
          alignItems="center"
          gap="$2"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          position="sticky"
          top={0}
          zIndex={10}
          backgroundColor="$background"
          paddingVertical="$2"
        >
          <Input
            flex={1}
            placeholder="Search material by name"
            onChangeText={onQueryChange}
          />
          {hasQuery && (
            <Button
              icon={X}
              circular
              size="$2"
              onPress={() => onQueryChange('')}
              accessibilityLabel="Clear search"
            />
          )}
          <Button
            icon={Filter}
            circular
            size="$2"
            onPress={onShowOnlyPendingToggle}
            theme={showOnlyPending ? 'yellow' : undefined}
            accessibilityLabel={
              showOnlyPending ? 'Show all materials' : 'Show only pending'
            }
          />
        </XStack>

        <YStack maxWidth={640} alignSelf="center" width="100%">
          <SizableText color="$gray10" paddingBottom="$2">
            {filled} / {total} materials checked
          </SizableText>

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
            const isPending = pendingRows[index] ?? false;

            const hiddenBySearch =
              hasQuery &&
              !field.materialName.toLowerCase().includes(lowerQuery);
            const hiddenByPendingFilter = showOnlyPending && !isPending;
            const hidden = hiddenBySearch || hiddenByPendingFilter;

            return (
              <XStack
                key={field.id}
                gap="$2"
                alignItems="center"
                paddingVertical="$2"
                paddingHorizontal="$2"
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                display={hidden ? 'none' : 'flex'}
                backgroundColor={isPending ? '$yellow3' : undefined}
                borderRadius="$2"
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
                {isPending && (
                  <XStack
                    backgroundColor="$yellow5"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$10"
                  >
                    <SizableText size="$1" color="$yellow11">
                      Pending
                    </SizableText>
                  </XStack>
                )}
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
