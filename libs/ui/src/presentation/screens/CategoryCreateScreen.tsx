import { ScrollView } from 'tamagui';
import { Layout, CategoryCreate } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useCategoryCreateController } from '../controllers';
import { CategoryCreateUsecase } from '../../domain';

export type CategoryCreateScreenProps = {
  categoryCreateUsecase: CategoryCreateUsecase;
};

export const CategoryCreateScreen = (props: CategoryCreateScreenProps) => {
  const controller = useCategoryCreateController(props.categoryCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/categories');
  }, [controller.state.type, router]);

  return (
    <Layout title="Create Category" showBackButton>
      <ScrollView>
        <CategoryCreate {...controller} />
      </ScrollView>
    </Layout>
  );
};
