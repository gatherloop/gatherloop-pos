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
import { OptionValue, Product } from '../../../domain';
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
import { FlatList } from 'react-native';
import { ProductListItem } from '../products';
import { Minus, Plus, X } from '@tamagui/lucide-icons';

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
  amount,
  onAmountChange,
}: TransactionItemSelectProps) => {
  const isCompactLayout = useIsCompactLayout();
  const productByCategories = products.reduce<Record<string, Product[]>>(
    (prev, curr) => ({
      ...prev,
      [curr.category.name]: [...(prev[curr.category.name] ?? []), curr],
    }),
    {}
  );

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
            // On compact, the dialog follows the viewport instead of a fixed
            // 500px, and is capped to a percentage of the screen height so
            // a many-option product scrolls instead of pushing Cancel/Submit
            // off screen (PRD FR-6). Desktop is untouched: 500px, unbounded.
            width={isCompactLayout ? '90%' : 500}
            maxWidth={500}
            maxHeight={isCompactLayout ? '85%' : undefined}
          >
            <Dialog.Title>{selectedProduct?.name}</Dialog.Title>

            <ScrollView flex={1}>
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
                        {option.values.map((value) => (
                          <XStack alignItems="center" gap="$2" key={value.id}>
                            <RadioGroup.Item
                              value={JSON.stringify(value)}
                              id={value.id.toString()}
                              size={2}
                              // Radio circles are visually $2 but the tap
                              // target is expanded to 44px on compact so
                              // they meet the minimum touch target (FR-6).
                              minWidth={isCompactLayout ? 44 : undefined}
                              minHeight={isCompactLayout ? 44 : undefined}
                            >
                              <RadioGroup.Indicator />
                            </RadioGroup.Item>

                            <Label size={2} htmlFor={value.id.toString()}>
                              {value.name}
                            </Label>
                          </XStack>
                        ))}
                      </XStack>
                    </RadioGroup>
                  </YStack>
                ))}
                <XStack gap="$2" alignItems="center">
                  <Button
                    icon={Minus}
                    variant="outlined"
                    size="$2"
                    onPress={() => onAmountChange(amount - 1)}
                    circular
                    disabled={amount === 1}
                    minWidth={isCompactLayout ? 44 : undefined}
                    minHeight={isCompactLayout ? 44 : undefined}
                  />

                  <Input
                    onChangeText={(text: string) => {
                      const numberValue =
                        text.trim() === '' ? 1 : parseFloat(text);
                      if (!isNaN(numberValue)) {
                        onAmountChange(numberValue);
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
                    minWidth={isCompactLayout ? 44 : undefined}
                    minHeight={isCompactLayout ? 44 : undefined}
                  />
                </XStack>
              </YStack>
            </ScrollView>
            <XStack gap="$3">
              <Button onPress={onUnselectProduct}>Cancel</Button>
              <Button
                theme="blue"
                onPress={onSubmit}
                disabled={variant.type === 'submitting'}
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
        // Reserves room below the picker so the floating cart button
        // (rendered by `TransactionFormView` on compact) never covers the
        // last product row or the pagination controls (PRD FR-3).
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
            // Autofocus would raise the keyboard over the product list
            // before the user has seen it on a phone (PRD FR-3).
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
                        renderItem={({ item }) => (
                          <Focusable
                            onEnterPress={() => onSelectProduct(item)}
                            style={{ flex: 1 }}
                          >
                            <ProductListItem
                              categoryName={item.category.name}
                              style={{ flex: 1 }}
                              name={item.name}
                              imageUrl={item.imageUrl}
                              onPress={() => onSelectProduct(item)}
                              saleType={item.saleType}
                              status={item.status}
                            />
                          </Focusable>
                        )}
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
