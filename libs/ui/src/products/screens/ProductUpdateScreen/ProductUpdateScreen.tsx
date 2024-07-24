import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductForm } from '../../components';
import { useProductUpdateScreenState } from './ProductUpdateScreen.state';

export type ProductUpdateScreenProps = {
  productId: number;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  const { productId, onSuccess } = useProductUpdateScreenState({
    productId: props.productId,
  });
  return (
    <Layout title="Update Product" showBackButton>
      <ScrollView>
        <ProductForm
          variant={{ type: 'update', productId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
