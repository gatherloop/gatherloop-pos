import { EmptyView, ErrorView, LoadingView, Pagination } from '../../../base';
import { Input, YStack } from 'tamagui';
import { useProductListState } from './ProductList.state';
import { ProductListItem } from '../ProductListItem';
import { FlatList } from 'react-native';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product } from '../../../../../api-contract/src';

export type ProductListProps = {
  isSearchAutoFocus?: boolean;
  onItemPress?: (product: Product) => void;
};

export const ProductList = ({
  isSearchAutoFocus,
  onItemPress,
}: ProductListProps) => {
  const {
    products,
    refetch,
    status,
    handleSearchInputChange,
    onDeleteMenuPress,
    onEditMenuPress,
    page,
    setPage,
    totalItem,
    itemPerPage,
  } = useProductListState();
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Products by Name"
          onChangeText={handleSearchInputChange}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>
      {status === 'pending' ? (
        <LoadingView title="Fetching Products..." />
      ) : status === 'success' ? (
        products.length > 0 ? (
          <>
            <FlatList
              nestedScrollEnabled
              data={products}
              renderItem={({ item: product }) => (
                <ProductListItem
                  categoryName={product.category.name}
                  name={product.name}
                  price={product.price}
                  onDeleteMenuPress={() => onDeleteMenuPress(product)}
                  onEditMenuPress={() => onEditMenuPress(product)}
                  onPress={() => {
                    if (onItemPress) {
                      onItemPress(product);
                    } else {
                      onEditMenuPress(product);
                    }
                  }}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={page}
              onChangePage={setPage}
              totalItem={totalItem}
              itemPerPage={itemPerPage}
            />
          </>
        ) : (
          <EmptyView
            title="Oops, Product is Empty"
            subtitle="Please create a new product"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Products"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
