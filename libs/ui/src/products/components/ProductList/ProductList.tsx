import { EmptyView, ErrorView, ListItemMenu, LoadingView } from '../../../base';
import { Input, YStack } from 'tamagui';
import { useProductListState } from './ProductList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product } from '../../../../../api-contract/src';
import { ProductCard } from '../ProductCard';
import { FlatList } from 'react-native';

export type ProductListProps = {
  itemMenus?: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (product: Product) => void;
    isShown?: (product: Product) => void;
  })[];
  onItemPress: (product: Product) => void;
  isSearchAutoFocus?: boolean;
};

export const ProductList = ({
  itemMenus = [],
  onItemPress,
  isSearchAutoFocus,
}: ProductListProps) => {
  const { products, refetch, status, searchInputValue, setSearchInputValue } =
    useProductListState();
  return (
    <YStack gap="$3">
      <Input
        placeholder="Search Products by Name"
        value={searchInputValue}
        onChangeText={setSearchInputValue}
        autoFocus={isSearchAutoFocus}
      />
      {status === 'pending' ? (
        <LoadingView title="Fetching Products..." />
      ) : status === 'success' ? (
        products.length > 0 ? (
          <FlatList
          nestedScrollEnabled
            data={products}
            renderItem={({ item: product }) => (
              <ProductCard
                categoryName={product.category?.name ?? ''}
                name={product.name}
                price={product.price}
                menus={itemMenus.map((itemMenu) => ({
                  ...itemMenu,
                  onPress: () => itemMenu.onPress(product),
                  isShown: () =>
                    itemMenu.isShown ? itemMenu.isShown(product) : true,
                }))}
                onPress={() => onItemPress(product)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
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
