import { H3, Paragraph, YStack, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductForm } from '../../components';
import { useProductCreateScreenState } from './ProductCreateScreen.state';

export const ProductCreateScreen = () => {
  const { onSuccess } = useProductCreateScreenState();
  return (
    <Layout>
      <YStack>
        <H3>Create Product</H3>
        <Paragraph>Make a new product</Paragraph>
      </YStack>
      <ScrollView>
        <ProductForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
