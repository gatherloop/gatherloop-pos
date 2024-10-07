import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { CategoryDeleteAlert, CategoryList } from '../../widgets';
import { Category } from '../../../../../domain';
import {
  useCategoryDeleteController,
  useCategoryListController,
} from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const categoryListController = useCategoryListController();
  const categoryDeleteController = useCategoryDeleteController();

  const router = useRouter();

  useEffect(() => {
    if (categoryDeleteController.state.type === 'deletingSuccess')
      categoryListController.dispatch({ type: 'FETCH' });
  }, [categoryDeleteController.state.type, categoryListController]);

  const onEditMenuPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  const onItemPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  const onDeleteMenuPress = (category: Category) => {
    categoryDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      categoryId: category.id,
    });
  };

  return (
    <>
      <CategoryList
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <CategoryDeleteAlert />
    </>
  );
};

export const CategoryListScreen = () => {
  return (
    <Layout
      title="Categories"
      rightActionItem={
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <Content />
    </Layout>
  );
};
