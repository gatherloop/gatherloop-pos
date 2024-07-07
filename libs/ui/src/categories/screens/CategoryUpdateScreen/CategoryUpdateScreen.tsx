import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryForm } from '../../components';
import { useCategoryUpdateScreenState } from './CategoryUpdateScreen.state';

export type CategoryUpdateScreenProps = {
  categoryId: number;
};

export const CategoryUpdateScreen = (props: CategoryUpdateScreenProps) => {
  const { categoryId, onSuccess } = useCategoryUpdateScreenState({
    categoryId: props.categoryId,
  });
  return (
    <Layout title="Update Category" showBackButton>
      <ScrollView>
        <CategoryForm
          variant={{ type: 'update', categoryId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
