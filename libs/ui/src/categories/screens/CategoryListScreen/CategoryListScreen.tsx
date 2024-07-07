import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { CategoryDeleteAlert } from '../../components/CategoryDeleteAlert';
import { useCategoryListScreenState } from './CategoryListScreen.state';

export const CategoryListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    categoryDeleteId,
  } = useCategoryListScreenState();

  return (
    <Layout>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <H3>Categories</H3>
          <Paragraph>Manage your product category</Paragraph>
        </YStack>
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      </XStack>
      <ScrollView>
        <CategoryList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof categoryDeleteId === 'number' && (
        <CategoryDeleteAlert
          categoryId={categoryDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
