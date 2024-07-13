import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useProductListState } from './ProductList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product } from '../../../../../api-contract/src';
import { Tag } from '@tamagui/lucide-icons';

export type ProductListProps = {
  itemMenus: { title: string; onPress: (product: Product) => void }[];
  onItemPress: (product: Product) => void;
};

export const ProductList = ({ itemMenus, onItemPress }: ProductListProps) => {
  const { products, refetch, status } = useProductListState();
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Products..." />
      ) : status === 'success' ? (
        products.length > 0 ? (
          products.map((product) => (
            <ListItem
              key={product.id}
              title={product.name}
              subtitle={`Rp. ${product.price.toLocaleString('id')}`}
              thumbnailSrc="https://picsum.photos/500/300"
              onPress={() => onItemPress(product)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(product),
              }))}
              footerItems={[
                {
                  value: product.category?.name ?? '',
                  icon: Tag,
                },
              ]}
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
    </YStack>
  );
};
