import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductMaterialForm } from '../../components';
import { useProductMaterialUpdateScreenState } from './ProductMaterialUpdateScreen.state';

export type ProductMaterialUpdateScreenProps = {
  productId: number;
  productMaterialId: number;
};

export const ProductMaterialUpdateScreen = (
  props: ProductMaterialUpdateScreenProps
) => {
  const { productId, productMaterialId, onSuccess } =
    useProductMaterialUpdateScreenState({
      productId: props.productId,
      productMaterialId: props.productMaterialId,
    });
  return (
    <Layout title="Update Product" showBackButton>
      <ScrollView>
        <ProductMaterialForm
          variant={{ type: 'update', productId, productMaterialId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
