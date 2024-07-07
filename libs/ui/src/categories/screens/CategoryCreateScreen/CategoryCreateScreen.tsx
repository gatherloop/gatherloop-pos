import { H3, Paragraph, YStack, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryForm } from '../../components';
import { useCategoryCreateScreenState } from './CategoryCreateScreen.state';

export const CategoryCreateScreen = () => {
  const { onSuccess } = useCategoryCreateScreenState();
  return (
    <Layout>
      <YStack>
        <H3>Create Category</H3>
        <Paragraph>Make a new category</Paragraph>
      </YStack>
      <ScrollView>
        <CategoryForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
