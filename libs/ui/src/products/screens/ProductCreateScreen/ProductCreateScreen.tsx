import { Card, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductForm } from '../../components';
import { useProductCreateScreenState } from './ProductCreateScreen.state';

export const ProductCreateScreen = () => {
  const { onSuccess } = useProductCreateScreenState();
  return (
    <Layout title="Create Product" showBackButton>
      <ScrollView>
        <Card maxWidth={500}>
          <Card.Header>
            <ProductForm variant={{ type: 'create' }} onSuccess={onSuccess} />
          </Card.Header>
        </Card>
      </ScrollView>
    </Layout>
  );
};
