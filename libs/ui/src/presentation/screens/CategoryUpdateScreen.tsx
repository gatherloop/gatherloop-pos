import { ScrollView } from 'tamagui';
import { Layout, CategoryUpdate } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useCategoryUpdateController } from '../controllers';
import { CategoryUpdateUsecase } from '../../domain';

export type CategoryUpdateScreenProps = {
  categoryUpdateUsecase: CategoryUpdateUsecase;
};

export const CategoryUpdateScreen = (props: CategoryUpdateScreenProps) => {
  const controller = useCategoryUpdateController(props.categoryUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/categories');
  }, [controller.state.type, router]);

  return (
    <Layout title="Update Category" showBackButton>
      <ScrollView>
        <CategoryUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
