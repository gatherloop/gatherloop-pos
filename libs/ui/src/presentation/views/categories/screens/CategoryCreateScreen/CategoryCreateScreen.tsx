import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryCreate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useCategoryCreateController } from '../../../../controllers';

const Content = () => {
  const controller = useCategoryCreateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/categories');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <CategoryCreate />
    </ScrollView>
  );
};

export const CategoryCreateScreen = () => {
  return (
    <Layout title="Create Category" showBackButton>
      <Content />
    </Layout>
  );
};
