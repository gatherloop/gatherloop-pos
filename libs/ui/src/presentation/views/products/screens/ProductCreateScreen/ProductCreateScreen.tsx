import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductCreate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useProductCreateController } from '../../../../controllers';

const Content = () => {
  const controller = useProductCreateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/products');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <ProductCreate />
    </ScrollView>
  );
};

export const ProductCreateScreen = () => {
  return (
    <Layout title="Create Product" showBackButton>
      <Content />
    </Layout>
  );
};
