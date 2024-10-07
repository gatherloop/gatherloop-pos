import { match, P } from 'ts-pattern';
import { Category } from '../../../../../domain';
import { CategoryListView, CategoryListViewProps } from './CategoryList.view';
import { useCategoryListController } from '../../../../controllers';
import { useFocusEffect } from '../../../../../utils';
import { useCallback } from 'react';

export type CategoryListProps = {
  onItemPress: (category: Category) => void;
  onDeleteMenuPress: (category: Category) => void;
  onEditMenuPress: (category: Category) => void;
};

export const CategoryList = ({
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
}: CategoryListProps) => {
  const { state, dispatch } = useCategoryListController();

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<CategoryListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ categories }) => ({
      type: categories.length > 0 ? 'loaded' : 'empty',
      items: categories.map((category) => ({
        name: category.name,
        onEditMenuPress: () => onEditMenuPress(category),
        onDeleteMenuPress: () => onDeleteMenuPress(category),
        onPress: () => onItemPress(category),
      })),
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <CategoryListView
      onRetryButtonPress={onRetryButtonPress}
      variant={variant}
    />
  );
};
