import { ScrollView } from 'tamagui';
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
        <ProductMaterialForm
          variant={{ type: 'create', productId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
