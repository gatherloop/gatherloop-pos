import { Input, YStack } from 'tamagui';
import { VariantListItem } from './VariantListItem';
import {
  EmptyView,
  ErrorView,
  Focusable,
  LoadingView,
  Pagination,
} from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Variant } from '../../../domain';

export type VariantListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onEditMenuPress?: (variant: Variant) => void;
  onDeleteMenuPress?: (variant: Variant) => void;
  onItemPress: (variant: Variant) => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Variant[] };
  numColumns?: number;
};

export const VariantList = ({
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
  numColumns = 1,
}: VariantListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Variants by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>

      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Variants..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Variant is Empty"
            subtitle="Please create a new variant"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            numColumns={numColumns}
            contentContainerStyle={{ gap: 16 }}
            columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
            renderItem={({ item }) => (
              <Focusable
                onEnterPress={() => onItemPress(item)}
                style={{ flex: 1 }}
              >
                <VariantListItem
                  productName={item.product.name}
                  productImageUrl={item.product.imageUrl}
                  style={{ flex: 1 }}
                  optionValues={item.values.map(
                    (variantValue) => variantValue.optionValue
                  )}
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
              </Focusable>
            )}
            ItemSeparatorComponent={() => (
              <YStack height="$1" style={{ flex: 1 }} />
            )}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Variants"
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
