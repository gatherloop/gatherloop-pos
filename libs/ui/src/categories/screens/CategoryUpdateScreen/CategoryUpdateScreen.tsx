import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
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
    <Layout>
      <YStack>
        <H3>Update Category</H3>
        <Paragraph>Update your existing category</Paragraph>
      </YStack>
      <ScrollView>
        <CategoryForm
          variant={{ type: 'update', categoryId }}
          onSuccess={onSuccess}
        />
      </ScrollView>
    </Layout>
  );
};
