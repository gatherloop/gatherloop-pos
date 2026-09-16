import {
  Button,
  Dialog,
  H4,
  H5,
  Input,
  Label,
  Paragraph,
  RadioGroup,
  ScrollView,
  XStack,
  YStack,
} from 'tamagui';
import { OptionValue, Product, Variant } from '../../../../domain';
import { match, P } from 'ts-pattern';
import {
  EmptyView,
  ErrorView,
  Focusable,
  LoadingView,
  Pagination,
  Tabs,
  useIsCompactLayout,
} from '../base';
import { FlatList, useWindowDimensions } from 'react-native';
import { ProductListItem } from '../products';
import { Minus, Plus, X } from '@tamagui/lucide-icons';
import { resolveOptionValueAvailability } from '../../../../utils';

export type TransactionItemSelectProps = {
  variant:
    | { type: 'loading' }
    | { type: 'empty' }
    | { type: 'loaded' }
    | { type: 'error' }
    | { type: 'selectingOptions' }
    | { type: 'submitting' }
    | { type: 'submited' };
  products: Product[];
  selectedProduct?: Product;
  selectedProductVariants: Variant[];
  selectedOptionValues: OptionValue[];
  onSelectProduct: (product: Product) => void;
  onUnselectProduct: () => void;
  onOptionValuesChange: (optionValues: OptionValue[]) => void;
  onSubmit: () => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  onPageChange: (page: number) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
};

export const TransactionItemSelect = ({
  variant,
  searchValue,
  onOptionValuesChange,
  onSelectProduct,
  onSubmit,
  onUnselectProduct,
  onSearchValueChange,
  onRetryButtonPress,
  currentPage,
  itemPerPage,
  onPageChange,
  totalItem,
  products,
  selectedOptionValues,
  selectedProduct,
  selectedProductVariants,
  amount,
  onAmountChange,
}: TransactionItemSelectProps) => {
  const isCompactLayout = useIsCompactLayout();
  const { height: windowHeight } = useWindowDimensions();
  const productByCategories = products.reduce<Record<string, Product[]>>(
    (prev, curr) => ({
      ...prev,
      [curr.category.name]: [...(prev[curr.category.name] ?? []), curr],
    }),
    {}
  );

  const optionValueAvailability =
    selectedProduct &&
    selectedProduct.saleType === 'purchase' &&
    selectedProductVariants.length > 0
      ? resolveOptionValueAvailability(
          selectedProduct,
          selectedProductVariants,
          selectedOptionValues.map(({ id }) => id)
        )
      : {};

  const selectedVariantMatch =
    selectedProduct?.saleType === 'purchase'
      ? selectedProductVariants.find(
          (candidate) =>
            candidate.values.length === selectedOptionValues.length &&
            candidate.values.every((value) =>
              selectedOptionValues.some(
                (optionValue) => optionValue.id === value.optionValueId
              )
            )
        )
      : undefined;

  const isSelectionSoldOut = selectedVariantMatch
    ? !selectedVariantMatch.isSellable
    : false;

  const remainingQuantityForSelection = selectedVariantMatch?.sellableQuantity;

  return (
    <YStack flex={1}>
      <Dialog
        modal
        open={variant.type === 'selectingOptions'}
        onOpenChange={() => onUnselectProduct()}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            backgroundColor="$shadow6"
            animateOnly={['transform', 'opacity']}
            animation={[
              'quicker',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            bordered
            paddingVertical="$4"
            paddingHorizontal="$6"
            elevate
            borderRadius="$6"
            key="content"
            animateOnly={['transform', 'opacity']}
            animation={[
              'quicker',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: 20, opacity: 0 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap="$4"
            width={isCompactLayout ? '90%' : 500}
            maxWidth={500}
            maxHeight="85%"
          >
            <Dialog.Title>{selectedProduct?.name}</Dialog.Title>

            <ScrollView maxHeight={windowHeight * 0.6}>
              <YStack gap="$3">
                {selectedProduct?.options.map((option, index) => (
                  <YStack key={option.id}>
                    <H5>{option.name}</H5>
                    <RadioGroup
                      value={
                        selectedOptionValues[index]
                          ? JSON.stringify(selectedOptionValues[index])
                          : undefined
                      }
                      onValueChange={(value) => {
                        const newOptionsValues = [...selectedOptionValues];
                        newOptionsValues[index] = JSON.parse(value);
                        onOptionValuesChange(newOptionsValues);
                      }}
                    >
                      <XStack flexWrap="wrap" gap="$3">
                        {option.values.map((value) => {
                          const isValueSoldOut =
                            optionValueAvailability[value.id] === false;

                          return (
                            <XStack
                              alignItems="center"
                              gap="$2"
                              key={value.id}
                              opacity={isValueSoldOut ? 0.5 : 1}
                            >
                              <RadioGroup.Item
                                value={JSON.stringify(value)}
                                id={value.id.toString()}
                                size={2}
                                disabled={isValueSoldOut}
                              >
                                <RadioGroup.Indicator />
                              </RadioGroup.Item>

                              <Label size={2} htmlFor={value.id.toString()}>
                                {value.name}
                              </Label>
                              {isValueSoldOut && (
                                <Paragraph size="$1" color="$red10">
                                  Sold out
                                </Paragraph>
                              )}
                            </XStack>
                          );
                        })}
                      </XStack>
                    </RadioGroup>
                  </YStack>
                ))}
                {isSelectionSoldOut ? (
                  <Paragraph color="$red10">
                    This combination is sold out
                  </Paragraph>
                ) : (
                  <XStack gap="$2" alignItems="center">
                    <Button
                      icon={Minus}
                      variant="outlined"
                      size="$2"
                      onPress={() => onAmountChange(amount - 1)}
                      circular
                      disabled={amount === 1}
                    />

                    <Input
                      onChangeText={(text: string) => {
                        const numberValue =
                          text.trim() === '' ? 1 : parseFloat(text);
                        if (!isNaN(numberValue)) {
                          onAmountChange(
                            remainingQuantityForSelection !== undefined
                              ? Math.min(
                                  numberValue,
                                  remainingQuantityForSelection
                                )
                              : numberValue
                          );
                        }
                      }}
                      value={amount.toString()}
                      flex={1}
                    />
                    <Button
                      icon={Plus}
                      variant="outlined"
                      size="$2"
                      onPress={() => onAmountChange(amount + 1)}
                      circular
                      disabled={
                        remainingQuantityForSelection !== undefined &&
                        amount >= remainingQuantityForSelection
                      }
                    />
                  </XStack>
                )}
                {!isSelectionSoldOut &&
                  remainingQuantityForSelection !== undefined && (
                    <Paragraph color="$gray10" size="$2">
                      {remainingQuantityForSelection} left
                    </Paragraph>
                  )}
              </YStack>
            </ScrollView>
            <XStack gap="$3">
              <Button onPress={onUnselectProduct}>Cancel</Button>
              <Button
                theme="blue"
                onPress={onSubmit}
                disabled={variant.type === 'submitting' || isSelectionSoldOut}
              >
                {variant.type === 'submitting' ? 'Submitting...' : 'Submit'}
              </Button>
            </XStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <YStack
        gap="$3"
        flex={1}
        paddingBottom={isCompactLayout ? 90 : undefined}
      >
        <H4>Select Product</H4>
        <Paragraph>
          You can select product and its options to the transaction
        </Paragraph>
        <XStack gap="$3">
          <Input
            placeholder="Search Products by Name"
            value={searchValue}
            onChangeText={onSearchValueChange}
            autoFocus={!isCompactLayout}
            flex={1}
          />
          <Button icon={X} onPress={() => onSearchValueChange('')} circular />
        </XStack>

        {match(variant)
          .with({ type: 'loading' }, () => (
            <LoadingView title="Fetching Products..." />
          ))
          .with({ type: 'empty' }, () => (
            <EmptyView
              title="Oops, Product is Empty"
              subtitle="Please create a new product"
            />
          ))
          .with(
            {
              type: P.union(
                'loaded',
                'selectingOptions',
                'submitting',
                'submited'
              ),
            },
            () => (
              <Tabs
                defaultValue={Object.keys(productByCategories)[0] ?? ''}
                tabs={Object.entries(productByCategories).map(
                  ([categoryName, products]) => ({
                    label: categoryName,
                    value: categoryName,
                    content: (
                      <FlatList
                        style={{ flex: 1 }}
                        data={products.sort((a, b) =>
                          a.name.localeCompare(b.name)
                        )}
                        contentContainerStyle={{ gap: 16 }}
                        renderItem={({ item }) => {
                          const isSoldOut =
                            item.saleType === 'purchase' && !item.isSellable;

                          return (
                            <Focusable
                              onEnterPress={
                                isSoldOut
                                  ? undefined
                                  : () => onSelectProduct(item)
                              }
                              style={{ flex: 1 }}
                            >
                              <ProductListItem
                                categoryName={item.category.name}
                                style={{ flex: 1 }}
                                name={item.name}
                                imageUrl={item.imageUrl}
                                onPress={
                                  isSoldOut
                                    ? undefined
                                    : () => onSelectProduct(item)
                                }
                                saleType={item.saleType}
                                status={item.status}
                                isSoldOut={isSoldOut}
                                remainingQuantity={
                                  item.saleType === 'purchase' &&
                                  item.availabilityTracking === 'product'
                                    ? item.sellableQuantity
                                    : undefined
                                }
                              />
                            </Focusable>
                          );
                        }}
                        ItemSeparatorComponent={() => (
                          <YStack height="$1" style={{ flex: 1 }} />
                        )}
                      />
                    ),
                  })
                )}
              />
            )
          )
          .with({ type: 'error' }, () => (
            <ErrorView
              title="Failed to Fetch Products"
              subtitle="Please click the retry button to refetch data"
              onRetryButtonPress={onRetryButtonPress}
            />
          ))
          .otherwise(() => null)}

        <Pagination
          currentPage={currentPage}
          onChangePage={onPageChange}
          totalItem={totalItem}
          itemPerPage={itemPerPage}
        />
      </YStack>
    </YStack>
  );
};
