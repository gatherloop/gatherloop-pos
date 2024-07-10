import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { XStack } from 'tamagui';
import { useProductMaterialListState } from './ProductMaterialList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { ProductMaterial } from '../../../../../api-contract/src';

export type ProductMaterialListProps = {
  itemMenus: { title: string; onPress: (product: ProductMaterial) => void }[];
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
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Product Materials..." />
      ) : status === 'success' ? (
        productMaterials.length > 0 ? (
          productMaterials.map((productMaterial) => (
            <ListItem
              key={productMaterial.id}
              title={`${productMaterial.material?.name}`}
              subtitle={`${productMaterial.amount} ${
                productMaterial.material?.unit
              } for Rp. ${(
                (productMaterial.material?.price ?? 0) * productMaterial.amount
              ).toLocaleString('id')}`}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
              onPress={() => onItemPress(productMaterial)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(productMaterial),
              }))}
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
    </XStack>
  );
};
