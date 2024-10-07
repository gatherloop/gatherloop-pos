import { Input, YStack } from 'tamagui';
import { ProductListItem, ProductListItemProps } from '../../components';
import { EmptyView, ErrorView, LoadingView, Pagination } from '../../../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';

export type ProductListViewProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onRetryButtonPress: () => void;
  onPageChange: (page: number) => void;
  isSearchAutoFocus: boolean;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ProductListItemProps[] };
};

export const ProductListView = ({
  onPageChange,
  onRetryButtonPress,
  onSearchValueChange,
  searchValue,
  isSearchAutoFocus,
  totalItem,
  currentPage,
  itemPerPage,
  variant,
}: ProductListViewProps) => {
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
            renderItem={({ item }) => <ProductListItem {...item} />}
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
