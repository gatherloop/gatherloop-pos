import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryUpdate } from '../../widgets';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useCategoryUpdateController } from '../../../../controllers';

const Content = () => {
  const controller = useCategoryUpdateController();
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/categories');
  }, [controller.state.type, router]);

  return (
    <ScrollView>
      <CategoryUpdate />
    </ScrollView>
  );
};

export const CategoryUpdateScreen = () => {
  return (
    <Layout title="Update Category" showBackButton>
      <Content />
    </Layout>
  );
};
