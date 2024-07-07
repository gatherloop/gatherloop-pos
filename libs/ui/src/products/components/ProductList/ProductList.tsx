import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { XStack } from 'tamagui';
import { useProductListState } from './ProductList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product } from '../../../../../api-contract/src';

export type ProductListProps = {
  itemMenus: { title: string; onPress: (product: Product) => void }[];
  onItemPress: (product: Product) => void;
};

export const ProductList = ({ itemMenus, onItemPress }: ProductListProps) => {
  const { products, refetch, status } = useProductListState();
  return (
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Products..." />
      ) : status === 'success' ? (
        products.length > 0 ? (
          products.map((product) => (
            <ListItem
              key={product.id}
              title={product.name}
              subtitle={`Rp. ${product.price.toLocaleString('id')}`}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
              onPress={() => onItemPress(product)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(product),
              }))}
            />
          ))
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
    </XStack>
  );
};
