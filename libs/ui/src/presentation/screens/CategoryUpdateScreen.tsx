import { ScrollView } from 'tamagui';
import { Layout, CategoryUpdate } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCategoryUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, CategoryUpdateUsecase } from '../../domain';

export type CategoryUpdateScreenProps = {
  categoryUpdateUsecase: CategoryUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CategoryUpdateScreen = (props: CategoryUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const controller = useCategoryUpdateController(props.categoryUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/categories');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Category" showBackButton>
      <ScrollView>
        <CategoryUpdate {...controller} />
      </ScrollView>
    </Layout>
  );
};
