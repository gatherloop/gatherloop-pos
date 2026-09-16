import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormContext } from 'react-hook-form';
import { Button, ScrollView, SizableText, Spinner, XStack, YStack } from 'tamagui';
import { Filter, X } from '@tamagui/lucide-icons';
import {
  DebouncedInput,
  EmptyView,
  FormErrorBanner,
  FormVariant,
  FormView,
  PinnedActionBar,
  useIsCompactLayout,
} from '../base';
import { AvailabilityForm, AvailabilityProduct, availabilityFormSchema } from '../../../../domain';
import { AvailabilityProductRow } from './AvailabilityProductRow';
import { AvailabilityViewHistoryPress } from './AvailabilityVariantRow';

const availabilityFormResolver = zodResolver(availabilityFormSchema);

export type AvailabilityFormViewProps = {
  variant: FormVariant;
  products: AvailabilityProduct[];
  defaultValues: AvailabilityForm;
  onSubmit: (values: AvailabilityForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
  onViewHistoryPress: AvailabilityViewHistoryPress;
};

export const AvailabilityFormView = (props: AvailabilityFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={availabilityFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Availability..."
    errorTitle="Failed to Fetch Availability"
    formProps={{ flex: 1, gap: undefined }}
  >
    {() => (
      <AvailabilityFields
        products={props.products}
        onSubmit={props.onSubmit}
        isSubmitDisabled={props.isSubmitDisabled}
        isSubmitting={props.isSubmitting}
        serverError={props.serverError}
        onViewHistoryPress={props.onViewHistoryPress}
      />
    )}
  </FormView>
);

type ProductRowMeta = {
  product: AvailabilityProduct;
  productIndex: number;
  hidden: boolean;
};

type AvailabilityFieldsProps = {
  products: AvailabilityProduct[];
  onSubmit: (values: AvailabilityForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
  onViewHistoryPress: AvailabilityViewHistoryPress;
};

const AvailabilityFields = ({
  products,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
  onViewHistoryPress,
}: AvailabilityFieldsProps) => {
  const form = useFormContext<AvailabilityForm>();
  const isCompactLayout = useIsCompactLayout();

  const [query, setQuery] = useState('');
  const [showOnlySoldOut, setShowOnlySoldOut] = useState(false);
  const toggleShowOnlySoldOut = () => setShowOnlySoldOut((prev) => !prev);

  const variantIndexByVariantId = new Map(
    products
      .flatMap((product) => product.variants)
      .map((variant, index) => [variant.variantId, index])
  );

  const lowerQuery = query.toLowerCase();
  const hasQuery = query.length > 0;

  const matchesQuery = (product: AvailabilityProduct) =>
    !hasQuery ||
    product.productName.toLowerCase().includes(lowerQuery) ||
    product.variants.some((variant) =>
      variant.variantName.toLowerCase().includes(lowerQuery)
    );

  const matchesSoldOutFilter = (product: AvailabilityProduct) =>
    !showOnlySoldOut || !product.isSellable;

  const rows: ProductRowMeta[] = products.map((product, productIndex) => ({
    product,
    productIndex,
    hidden: !(matchesQuery(product) && matchesSoldOutFilter(product)),
  }));

  const groups: { categoryId: number; categoryName: string; rows: ProductRowMeta[] }[] =
    [];
  for (const row of rows) {
    let group = groups.find((g) => g.categoryId === row.product.categoryId);
    if (!group) {
      group = {
        categoryId: row.product.categoryId,
        categoryName: row.product.categoryName,
        rows: [],
      };
      groups.push(group);
    }
    group.rows.push(row);
  }

  const soldOutCount = products.filter((product) => !product.isSellable).length;
  const noMatches = products.length > 0 && rows.every((row) => row.hidden);

  const handleSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const headerButtonSize = isCompactLayout ? '$3' : '$2';
  const headerButtonMinSize = isCompactLayout ? 44 : undefined;

  return (
    <>
      <YStack backgroundColor="$background" gap="$3" paddingVertical="$2">
        <FormErrorBanner message={serverError} />

        <XStack alignItems="center" gap="$2">
          <DebouncedInput
            flex={1}
            placeholder="Search product by name"
            value={query}
            onChangeText={setQuery}
            delay={400}
          />
          {hasQuery && (
            <Button
              icon={X}
              circular
              size={headerButtonSize}
              minWidth={headerButtonMinSize}
              minHeight={headerButtonMinSize}
              onPress={() => setQuery('')}
              accessibilityLabel="Clear search"
              // @ts-expect-error type is a valid HTML attribute on the underlying button
              type="button"
            />
          )}
          <Button
            icon={Filter}
            circular
            size={headerButtonSize}
            minWidth={headerButtonMinSize}
            minHeight={headerButtonMinSize}
            onPress={toggleShowOnlySoldOut}
            theme={showOnlySoldOut ? 'yellow' : undefined}
            accessibilityLabel={
              showOnlySoldOut ? 'Show all products' : 'Show only sold out'
            }
            // @ts-expect-error type is a valid HTML attribute on the underlying button
            type="button"
          />
        </XStack>

        <SizableText color="$gray10">
          {soldOutCount} / {products.length} products sold out
        </SizableText>
      </YStack>

      {products.length === 0 ? (
        <EmptyView
          title="No products yet"
          subtitle="Published, purchasable products will show up here."
        />
      ) : (
        <YStack flex={1}>
          <ScrollView flex={1}>
            <YStack
              maxWidth={720}
              alignSelf="center"
              width="100%"
              gap="$4"
              paddingBottom={isCompactLayout ? 96 : '$3'}
            >
              {noMatches && (
                <SizableText color="$gray10" textAlign="center" paddingVertical="$4">
                  No products match the current search or filter
                </SizableText>
              )}

              {groups.map((group) => {
                const groupHidden = group.rows.every((row) => row.hidden);
                return (
                  <YStack
                    key={group.categoryId}
                    gap="$2"
                    display={groupHidden ? 'none' : 'flex'}
                  >
                    <SizableText fontWeight="600" size="$3">
                      {group.categoryName}
                    </SizableText>
                    {group.rows.map((row) => (
                      <AvailabilityProductRow
                        key={row.product.productId}
                        product={row.product}
                        productIndex={row.productIndex}
                        variantIndexByVariantId={variantIndexByVariantId}
                        hidden={row.hidden}
                        onViewHistoryPress={onViewHistoryPress}
                      />
                    ))}
                  </YStack>
                );
              })}

              {!isCompactLayout && (
                <Button
                  disabled={isSubmitDisabled}
                  onPress={handleSubmit}
                  theme="blue"
                  icon={isSubmitting ? <Spinner /> : undefined}
                >
                  Save
                </Button>
              )}
            </YStack>
          </ScrollView>

          {isCompactLayout && (
            <PinnedActionBar>
              <Button
                disabled={isSubmitDisabled}
                onPress={handleSubmit}
                theme="blue"
                size="$5"
                minHeight={44}
                icon={isSubmitting ? <Spinner /> : undefined}
                accessibilityLabel="Save"
              >
                Save
              </Button>
            </PinnedActionBar>
          )}
        </YStack>
      )}
    </>
  );
};
