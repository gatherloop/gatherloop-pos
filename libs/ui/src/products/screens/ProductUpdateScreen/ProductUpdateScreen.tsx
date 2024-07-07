import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
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
    <Layout>
      <YStack>
        <H3>Update Product</H3>
        <Paragraph>Update your existing Product</Paragraph>
      </YStack>
      <ScrollView>
        <ProductForm
          variant={{ type: 'update', productId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
