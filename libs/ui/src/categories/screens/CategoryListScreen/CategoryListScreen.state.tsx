// eslint-disable-next-line @nx/enforce-module-boundaries
import { Category } from '../../../../../api-contract/src';
import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type CategoryListScreenParams = {
  categoryDeleteId?: number;
};

const { useParam } = createParam<CategoryListScreenParams>();

export const useCategoryListScreenState = () => {
  const [categoryDeleteId, setCategoryDeleteId] = useParam('categoryDeleteId', {
    initial: undefined,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : undefined,
  });
  const router = useRouter();

  const onItemPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  const onEditMenuPress = (category: Category) => {
    router.push(`/categories/${category.id}`);
  };

  const onDeleteMenuPress = (category: Category) => {
    setCategoryDeleteId(category.id);
  };

  const onDeleteSuccess = () => {
    router.replace('/categories', undefined, {
      experimental: {
        nativeBehavior: 'stack-replace',
        isNestedNavigator: false,
      },
    });
  };

  const onDeleteCancel = () => {
    setCategoryDeleteId(undefined);
  };

  return {
    categoryDeleteId,
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
  };
};
