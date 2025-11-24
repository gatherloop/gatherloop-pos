import { Input, YStack } from 'tamagui';
import { SupplierListItem } from './SupplierListItem';
import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Supplier } from '../../../domain';

export type SupplierListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  onOpenMapMenuPress?: (supplier: Supplier) => void;
  onEditMenuPress?: (supplier: Supplier) => void;
  onDeleteMenuPress?: (supplier: Supplier) => void;
  onItemPress: (supplier: Supplier) => void;
  isSearchAutoFocus?: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Supplier[] };
};

export const SupplierList = ({
  onPageChange,
  onRetryButtonPress,
  onSearchValueChange,
  onOpenMapMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  searchValue,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  variant,
}: SupplierListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Suppliers by Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>

      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Suppliers..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Supplier is Empty"
            subtitle="Please create a new supplier"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <SupplierListItem
                name={item.name}
                address={item.address}
                mapsLink={item.mapsLink}
                phone={item.phone}
                onOpenMapMenuPress={
                  onOpenMapMenuPress
                    ? () => onOpenMapMenuPress(item)
                    : undefined
                }
                onEditMenuPress={
                  onEditMenuPress ? () => onEditMenuPress(item) : undefined
                }
                onDeleteMenuPress={
                  onDeleteMenuPress ? () => onDeleteMenuPress(item) : undefined
                }
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Suppliers"
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
