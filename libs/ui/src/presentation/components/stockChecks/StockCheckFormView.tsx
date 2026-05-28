import { useRef } from 'react';
import {
  FormProvider,
  useFieldArray,
  useFormState,
  UseFormReturn,
} from 'react-hook-form';
import {
  Button,
  Form,
  Label,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Filter, X } from '@tamagui/lucide-icons';
import { DebouncedInput, FormErrorBanner, InputNumber } from '../base';
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
  const { isSubmitted } = useFormState({ control: form.control });
  const rowRefs = useRef<any[]>([]);

  const pendingCount = pendingRows.filter(Boolean).length;

  const lowerQuery = query.toLowerCase();
  const matchCount = lowerQuery
    ? fields.filter((f) => f.materialName.toLowerCase().includes(lowerQuery))
        .length
    : fields.length;
  const hasQuery = query.length > 0;
  const noMatches = hasQuery && matchCount === 0;

  const handleSubmit = () => {
    if (pendingCount > 0) {
      onQueryChange('');
      if (!showOnlyPending) onShowOnlyPendingToggle();
      const firstPendingIndex = pendingRows.findIndex(Boolean);
      if (firstPendingIndex >= 0) {
        requestAnimationFrame(() => {
          rowRefs.current[firstPendingIndex]?.scrollIntoView?.({
            behavior: 'smooth',
            block: 'center',
          });
          const input =
            rowRefs.current[firstPendingIndex]?.querySelector?.('input');
          (input as HTMLInputElement | null)?.focus?.();
        });
      }
    }
    form.handleSubmit(onSubmit)();
  };

  return (
    <FormProvider {...form}>
      <Form onSubmit={handleSubmit} gap="$3">
        <FormErrorBanner message={serverError} />
        {isSubmitted && pendingCount > 0 && (
          <FormErrorBanner
            message={`${pendingCount} material${
              pendingCount !== 1 ? 's' : ''
            } still need a stock count`}
          />
        )}

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
          <DebouncedInput
            flex={1}
            placeholder="Search material by name"
            value={query}
            onChangeText={onQueryChange}
            delay={400}
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

        <YStack maxWidth={640} alignSelf="center" width="100%" gap="$2">
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
            const isErrorRow = isSubmitted && isPending;

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
                paddingVertical="$3"
                paddingHorizontal="$4"
                borderWidth={1}
                borderColor="$borderColor"
                display={hidden ? 'none' : 'flex'}
                backgroundColor={
                  isErrorRow ? '$red3' : isPending ? '$yellow3' : undefined
                }
                borderRadius="$4"
                ref={(el: any) => {
                  rowRefs.current[index] = el;
                }}
              >
                <Label flex={1} numberOfLines={1} htmlFor={inputId}>
                  {field.materialName}
                </Label>
                <YStack>
                  <InputNumber
                    name={`items.${index}.currentStock`}
                    width={100}
                    id={inputId}
                    error={isErrorRow}
                    aria-invalid={isErrorRow || undefined}
                  />
                  {isErrorRow && (
                    <SizableText size="$1" color="$red10" role="alert">
                      Please enter the current stock
                    </SizableText>
                  )}
                </YStack>
                <SizableText width={60} color="$gray10">
                  {field.purchaseUnit}
                </SizableText>
                <XStack width={60} justifyContent="center">
                  {isPending && (
                    <XStack
                      backgroundColor={isErrorRow ? '$red5' : '$yellow5'}
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius="$10"
                    >
                      <SizableText
                        size="$1"
                        color={isErrorRow ? '$red11' : '$yellow11'}
                      >
                        Pending
                      </SizableText>
                    </XStack>
                  )}
                </XStack>
              </XStack>
            );
          })}
        </YStack>

        <Button
          disabled={isSubmitDisabled}
          onPress={handleSubmit}
          theme="blue"
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
