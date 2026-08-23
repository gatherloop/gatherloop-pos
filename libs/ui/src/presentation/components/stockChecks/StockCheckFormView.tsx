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
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Filter, X } from '@tamagui/lucide-icons';
import { DebouncedInput, FormErrorBanner, useIsCompactLayout } from '../base';
import { StockCheckForm } from '../../../domain';
import { StockCheckItemRow } from './StockCheckItemRow';

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
  const isCompactLayout = useIsCompactLayout();

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

  // FR-4 in docs/prd-stock-check-form-mobile.md: `position: sticky` is
  // web-only, so the search/filter/counter header is rendered as a fixed
  // sibling above a bounded `ScrollView` instead — this pins it on React
  // Native as well as web, with no `Platform.OS` branch. Identical on both
  // layouts; only the header buttons' touch target grows on compact.
  const headerButtonSize = isCompactLayout ? '$3' : '$2';
  const headerButtonMinSize = isCompactLayout ? 44 : undefined;

  return (
    <FormProvider {...form}>
      <Form onSubmit={handleSubmit} flex={1}>
        <YStack backgroundColor="$background" gap="$3" paddingVertical="$2">
          <FormErrorBanner message={serverError} />
          {isSubmitted && pendingCount > 0 && (
            <FormErrorBanner
              message={`${pendingCount} material${
                pendingCount !== 1 ? 's' : ''
              } still need a stock count`}
            />
          )}

          <XStack alignItems="center" gap="$2">
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
                size={headerButtonSize}
                minWidth={headerButtonMinSize}
                minHeight={headerButtonMinSize}
                onPress={() => onQueryChange('')}
                accessibilityLabel="Clear search"
              />
            )}
            <Button
              icon={Filter}
              circular
              size={headerButtonSize}
              minWidth={headerButtonMinSize}
              minHeight={headerButtonMinSize}
              onPress={onShowOnlyPendingToggle}
              theme={showOnlyPending ? 'yellow' : undefined}
              accessibilityLabel={
                showOnlyPending ? 'Show all materials' : 'Show only pending'
              }
            />
          </XStack>

          <SizableText color="$gray10">
            {filled} / {total} materials checked
          </SizableText>
        </YStack>

        <ScrollView flex={1}>
          <YStack
            maxWidth={640}
            alignSelf="center"
            width="100%"
            gap="$3"
            paddingBottom="$3"
          >
            <YStack gap="$2">
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
                  <StockCheckItemRow
                    key={field.id}
                    materialName={field.materialName}
                    purchaseUnit={field.purchaseUnit}
                    fieldName={`items.${index}.currentStock`}
                    inputId={inputId}
                    isPending={isPending}
                    isErrorRow={isErrorRow}
                    hidden={hidden}
                    ref={(el: any) => {
                      rowRefs.current[index] = el;
                    }}
                  />
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
          </YStack>
        </ScrollView>
      </Form>
    </FormProvider>
  );
};
