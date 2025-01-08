import { ScrollView } from 'tamagui';
import { Layout, CategoryCreate } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCategoryCreateController,
} from '../controllers';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../../domain';

export type CategoryCreateScreenProps = {
  categoryCreateUsecase: CategoryCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CategoryCreateScreen = (props: CategoryCreateScreenProps) => {
  const categoryCreateController = useCategoryCreateController(
    props.categoryCreateUsecase
  );
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const router = useRouter();

  useEffect(() => {
    if (categoryCreateController.state.type === 'submitSuccess')
      router.push('/categories');
  }, [categoryCreateController.state.type, router]);

  return (
    <Layout title="Create Category" showBackButton {...authLogoutController}>
      <ScrollView>
        <CategoryCreate {...categoryCreateController} />
      </ScrollView>
    </Layout>
  );
};
