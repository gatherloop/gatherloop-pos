import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductUpdate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useProductUpdateController } from '../../../../controllers';

const Content = () => {
  const controller = useProductUpdateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/products');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <ProductUpdate />
    </ScrollView>
  );
};

export const ProductUpdateScreen = () => {
  return (
    <Layout title="Update Product" showBackButton>
      <Content />
    </Layout>
  );
};
