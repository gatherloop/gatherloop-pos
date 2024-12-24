import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { CategoryDeleteAlert, CategoryList, Layout } from '../components';
import {
  Category,
  CategoryDeleteUsecase,
  CategoryListUsecase,
} from '../../domain';
import {
  useCategoryDeleteController,
  useCategoryListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type CategoryListScreenProps = {
  categoryListUsecase: CategoryListUsecase;
  categoryDeleteUsecase: CategoryDeleteUsecase;
};

export const CategoryListScreen = (props: CategoryListScreenProps) => {
  const categoryListController = useCategoryListController(
    props.categoryListUsecase
  );
  const categoryDeleteController = useCategoryDeleteController(
    props.categoryDeleteUsecase
  );

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
    <Layout
      title="Categories"
      rightActionItem={
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CategoryList
        {...categoryListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <CategoryDeleteAlert {...categoryDeleteController} />
    </Layout>
  );
};
