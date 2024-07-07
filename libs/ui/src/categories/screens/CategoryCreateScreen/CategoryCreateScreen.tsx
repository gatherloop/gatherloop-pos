import { ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryForm } from '../../components';
import { useCategoryCreateScreenState } from './CategoryCreateScreen.state';

export const CategoryCreateScreen = () => {
  const { onSuccess } = useCategoryCreateScreenState();
  return (
    <Layout title="Create Category" showBackButton>
      <ScrollView>
        <CategoryForm variant={{ type: 'create' }} onSuccess={onSuccess} />
      </ScrollView>
    </Layout>
  );
};
