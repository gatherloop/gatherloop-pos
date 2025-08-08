import {
  Button,
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
import { match } from 'ts-pattern';
import {
  EmptyView,
  ErrorView,
  Focusable,
  LoadingView,
  Pagination,
  Tabs,
} from '../base';
import { FlatList } from 'react-native';
import { ProductListItem } from '../products';
import { ArrowLeft } from '@tamagui/lucide-icons';

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
}: TransactionItemSelectProps) => {
  const productByCategories = products.reduce<Record<string, Product[]>>(
    (prev, curr) => ({
      ...prev,
      [curr.category.name]: [...(prev[curr.category.name] ?? []), curr],
    }),
    {}
  );

  return (
    <YStack flex={1}>
      {variant.type === 'selectingOptions' || variant.type === 'submitting' ? (
        <YStack gap="$3">
          <XStack alignItems="center" gap="$3">
            <Button icon={ArrowLeft} circular onPress={onUnselectProduct} />
            <H4>{selectedProduct?.name}</H4>
          </XStack>

          <H5>Choose Options</H5>
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
                <XStack flexWrap="wrap">
                  {option.values.map((value) => (
                    <XStack
                      width={300}
                      alignItems="center"
                      gap="$2"
                      key={value.id}
                    >
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
        </YStack>
      ) : (
        <YStack gap="$3" flex={1}>
          <H4>Select Product</H4>
          <Paragraph>
            You can select product and its options to the transaction
          </Paragraph>
          <YStack>
            <Input
              placeholder="Search Products by Name"
              value={searchValue}
              onChangeText={onSearchValueChange}
              autoFocus
            />
          </YStack>

          <ScrollView flex={1}>
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
              .with({ type: 'loaded' }, () => (
                <Tabs
                  defaultValue={Object.keys(productByCategories)[0] ?? ''}
                  tabs={Object.entries(productByCategories).map(
                    ([categoryName, products]) => ({
                      label: categoryName,
                      value: categoryName,
                      content: (
                        <FlatList
                          nestedScrollEnabled
                          scrollEnabled
                          data={products.sort((a, b) =>
                            a.name.localeCompare(b.name)
                          )}
                          numColumns={5}
                          contentContainerStyle={{ gap: 16 }}
                          columnWrapperStyle={{ gap: 16 }}
                          renderItem={({ item }) => (
                            <Focusable
                              onEnterPress={() => onSelectProduct(item)}
                              style={{ flex: 1 }}
                            >
                              <ProductListItem
                                categoryName={item.category.name}
                                style={{ flex: 1 }}
                                name={item.name}
                                onPress={() => onSelectProduct(item)}
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
              ))
              .with({ type: 'error' }, () => (
                <ErrorView
                  title="Failed to Fetch Products"
                  subtitle="Please click the retry button to refetch data"
                  onRetryButtonPress={onRetryButtonPress}
                />
              ))
              .otherwise(() => null)}
          </ScrollView>

          <Pagination
            currentPage={currentPage}
            onChangePage={onPageChange}
            totalItem={totalItem}
            itemPerPage={itemPerPage}
          />
        </YStack>
      )}
    </YStack>
  );
};
