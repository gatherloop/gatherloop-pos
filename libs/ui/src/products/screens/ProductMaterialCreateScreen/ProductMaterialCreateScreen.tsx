import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductMaterialForm } from '../../components';
import { useProductCreateScreenState } from './ProductMaterialCreateScreen.state';

export type ProductMaterialCreateScreenProps = {
  productId: number;
};

export const ProductMaterialCreateScreen = (
  props: ProductMaterialCreateScreenProps
) => {
  const { onSuccess, productId } = useProductCreateScreenState({
    productId: props.productId,
  });
  return (
    <Layout title="Create Product Material" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <ProductMaterialForm
              variant={{ type: 'create', productId }}
              onSuccess={onSuccess}
            />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
