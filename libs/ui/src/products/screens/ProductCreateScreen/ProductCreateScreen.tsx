import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductForm } from '../../components';
import { useProductCreateScreenState } from './ProductCreateScreen.state';

export const ProductCreateScreen = () => {
  const { onSuccess } = useProductCreateScreenState();
  return (
    <Layout title="Create Product" showBackButton>
      <ScrollView>
        <ProductForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
