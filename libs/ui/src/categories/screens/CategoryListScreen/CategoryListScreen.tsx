import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryList, CategoryDeleteAlert } from '../../components';
import { Link } from 'solito/link';
import { Pencil, Plus, Trash } from '@tamagui/lucide-icons';
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
    <Layout
      title="Categories"
      rightActionItem={
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <CategoryList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
            { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof categoryDeleteId === 'number' && (
        <CategoryDeleteAlert
          categoryId={categoryDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
          key={categoryDeleteId}
        />
      )}
    </Layout>
  );
};
