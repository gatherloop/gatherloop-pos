import { Button, H4, ScrollView, XStack } from 'tamagui';
import { Layout } from '../../../base';
import { ProductDetail, ProductMaterialList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { ProductMaterialDeleteAlert } from '../../components/ProductMaterialDeleteAlert';
import { useProductMaterialListScreenState } from './ProductMaterialListScreen.state';

export type ProductMaterialListScreenProps = {
  productId: number;
};

export const ProductMaterialListScreen = (
  props: ProductMaterialListScreenProps
) => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    productId,
    productMaterialDeleteId,
  } = useProductMaterialListScreenState({ productId: props.productId });

  return (
    <Layout title="Product Materials" showBackButton>
      <ProductDetail productId={productId} />
      <XStack justifyContent="space-between" alignItems="center">
        <H4>List of Materials</H4>
        <Link href={`/products/${productId}/materials/create`}>
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      </XStack>
      <ScrollView>
        <ProductMaterialList
          productId={productId}
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof productMaterialDeleteId === 'number' && (
        <ProductMaterialDeleteAlert
          productId={productId}
          productMaterialId={productMaterialDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
