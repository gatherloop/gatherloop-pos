import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { YStack } from 'tamagui';
import { useProductMaterialListState } from './ProductMaterialList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ProductMaterial } from '../../../../../api-contract/src';
import { Box } from '@tamagui/lucide-icons';

export type ProductMaterialListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (productMaterial: ProductMaterial) => void;
    isShown?: (productMaterial: ProductMaterial) => void;
  })[];
  onItemPress: (product: ProductMaterial) => void;
  productId: number;
};

export const ProductMaterialList = ({
  itemMenus,
  onItemPress,
  productId,
}: ProductMaterialListProps) => {
  const { productMaterials, refetch, status } = useProductMaterialListState({
    productId,
  });
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Product Materials..." />
      ) : status === 'success' ? (
        productMaterials.length > 0 ? (
          productMaterials.map((productMaterial) => (
            <ListItem
              key={productMaterial.id}
              title={`${productMaterial.material?.name}`}
              subtitle={`${productMaterial.amount} ${productMaterial.material?.unit}`}
              onPress={() => onItemPress(productMaterial)}
              thumbnailSrc="https://placehold.jp/120x120.png"
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(productMaterial),
                isShown: () =>
                  itemMenu.isShown ? itemMenu.isShown(productMaterial) : true,
              }))}
              footerItems={[
                {
                  value: `Rp. ${(
                    productMaterial.amount *
                    (productMaterial.material?.price ?? 0)
                  ).toLocaleString('id')}`,
                  icon: Box,
                },
              ]}
            />
          ))
        ) : (
          <EmptyView
            title="Oops, Product Material is Empty"
            subtitle="Please create a new product material"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Product Materials"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
