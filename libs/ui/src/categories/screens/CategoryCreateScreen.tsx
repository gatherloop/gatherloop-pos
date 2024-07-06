import { H3, Paragraph, YStack } from 'tamagui';
import { Layout } from '../../base';
import { CategoryForm } from '../components';

export const CategoryCreateScreen = () => {
  return (
    <Layout>
      <YStack>
        <H3>Create Category</H3>
        <Paragraph>Make a new category</Paragraph>
      </YStack>
      <CategoryForm />
    </Layout>
  );
};
