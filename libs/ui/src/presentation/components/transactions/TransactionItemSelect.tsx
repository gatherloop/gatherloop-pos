import {
  Button,
  Dialog,
  H4,
  H5,
  Input,
  Label,
  Paragraph,
  RadioGroup,
  useMedia,
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
  Sheet,
  Tabs,
} from '../base';
import { FlatList, Platform } from 'react-native';
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

// FR-7 (docs/prd-transaction-mobile-ux.md, Phase 7): the option/amount step
// body is shared between the desktop Dialog and the mobile Sheet so the two
// shells can't drift — only the surrounding shell differs.
type TransactionItemOptionsBodyProps = {
  selectedProduct?: Product;
  selectedOptionValues: OptionValue[];
  onOptionValuesChange: (optionValues: OptionValue[]) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
  onUnselectProduct: () => void;
  isSubmitting: boolean;
};

const TransactionItemOptionsBody = ({
  selectedProduct,
  selectedOptionValues,
  onOptionValuesChange,
  amount,
  onAmountChange,
  onSubmit,
  onUnselectProduct,
  isSubmitting,
}: TransactionItemOptionsBodyProps) => (
  <YStack gap="$3" flex={1}>
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
      />

      <Input
        onChangeText={(text: string) => {
          const numberValue = text.trim() === '' ? 1 : parseFloat(text);
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
      />
    </XStack>
    {/* FR-7: full-width, size="$4" actions — the primary action on the
        screen a cashier taps most shouldn't be a small centered button. */}
    <XStack gap="$3">
      <Button flex={1} size="$4" onPress={onUnselectProduct}>
        Cancel
      </Button>
      <Button
        flex={1}
        size="$4"
        theme="blue"
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </XStack>
  </YStack>
);

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
  const media = useMedia();
  const isSelectingOptions = variant.type === 'selectingOptions';
  const isSubmitting = variant.type === 'submitting';

  const productByCategories = products.reduce<Record<string, Product[]>>(
    (prev, curr) => ({
      ...prev,
      [curr.category.name]: [...(prev[curr.category.name] ?? []), curr],
    }),
    {}
  );

  return (
    <YStack flex={1}>
      {media.xs ? (
        <Sheet
          isOpen={isSelectingOptions}
          onOpenChange={() => onUnselectProduct()}
        >
          <YStack gap="$4" flex={1} padding="$5">
            <H4>{selectedProduct?.name}</H4>
            <TransactionItemOptionsBody
              selectedProduct={selectedProduct}
              selectedOptionValues={selectedOptionValues}
              onOptionValuesChange={onOptionValuesChange}
              amount={amount}
              onAmountChange={onAmountChange}
              onSubmit={onSubmit}
              onUnselectProduct={onUnselectProduct}
              isSubmitting={isSubmitting}
            />
          </YStack>
        </Sheet>
      ) : (
        <Dialog
          modal
          open={isSelectingOptions}
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
              maxWidth={500}
              width="100%"
            >
              <Dialog.Title>{selectedProduct?.name}</Dialog.Title>

              <TransactionItemOptionsBody
                selectedProduct={selectedProduct}
                selectedOptionValues={selectedOptionValues}
                onOptionValuesChange={onOptionValuesChange}
                amount={amount}
                onAmountChange={onAmountChange}
                onSubmit={onSubmit}
                onUnselectProduct={onUnselectProduct}
                isSubmitting={isSubmitting}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      )}

      <YStack gap="$3" flex={1}>
        <H4>Select Product</H4>
        <Paragraph>
          You can select product and its options to the transaction
        </Paragraph>
        <XStack gap="$3">
          <Input
            placeholder="Search Products by Name"
            value={searchValue}
            onChangeText={onSearchValueChange}
            // FR-7: `autoFocus` opens the soft keyboard the instant this
            // mounts, covering the product list a cashier came to read — a
            // keyboard-station affordance, not a touch one. Same
            // platform/breakpoint guard as the print menus in
            // TransactionListItem.tsx.
            autoFocus={Platform.OS === 'web' && !media.xs}
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
                      // FR-7: the FlatList is the only scroller here — the
                      // intermediate ScrollView that used to wrap it left the
                      // list with no bounded height inside the outer page
                      // scroll, so it either collapsed to nothing or
                      // captured drags meant for the page (same pattern as
                      // ProductList.tsx, which never wraps its FlatList in a
                      // ScrollView either).
                      <FlatList
                        nestedScrollEnabled
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
