import { Input, YStack } from 'tamagui';
import { ProductListItem } from './ProductListItem';
import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Product } from '../../../domain';

export type ProductListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onEditMenuPress?: (product: Product) => void;
  onDeleteMenuPress?: (product: Product) => void;
  onItemPress: (product: Product) => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Product[] };
};

export const ProductList = ({
  onPageChange,
  onRetryButtonPress,
  onSearchValueChange,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  searchValue,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  variant,
}: ProductListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Products by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>

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
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <ProductListItem
                categoryName={item.category.name}
                name={item.name}
                price={item.price}
                onDeleteMenuPress={
                  onDeleteMenuPress
                    ? () => onDeleteMenuPress(item)
                    : onDeleteMenuPress
                }
                onEditMenuPress={
                  onEditMenuPress
                    ? () => onEditMenuPress(item)
                    : onEditMenuPress
                }
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
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

      <Pagination
        currentPage={currentPage}
        onChangePage={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
      />
    </YStack>
  );
};
