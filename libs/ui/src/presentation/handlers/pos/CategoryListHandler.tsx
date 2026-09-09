import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Category,
  CategoryDeleteUsecase,
  CategoryListUsecase,
} from '../../../domain';
import { CategoryListScreen, CategoryListScreenProps } from '../../screens/pos/CategoryListScreen';
import { match, P } from 'ts-pattern';
import { useCallback, useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import { useFocusEffect } from '../../../utils';

export type CategoryListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  categoryListUsecase: CategoryListUsecase;
  categoryDeleteUsecase: CategoryDeleteUsecase;
};

export const CategoryListHandler = ({
  authLogoutUsecase,
  categoryListUsecase,
  categoryDeleteUsecase,
}: CategoryListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const categoryList = useUsecase(categoryListUsecase);
  const categoryDelete = useUsecase(categoryDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useFocusEffect(
    useCallback(() => {
      categoryList.dispatch({ type: 'FETCH' });
    }, [categoryList.dispatch])
  );

  useEffect(() => {
    match(categoryDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        toast.show('Delete Category Success');
        categoryList.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'deletingError' }, () => {
        toast.show('Delete Category Error');
      })
      .otherwise(() => {
        // nothing to do
      });
  }, [categoryDelete.state, categoryList, toast]);

  return (
    <CategoryListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(category: Category) =>
        router.push(`/categories/${category.id}`)
      }
      onItemPress={(category: Category) =>
        router.push(`/categories/${category.id}`)
      }
      onDeleteMenuPress={(category: Category) =>
        categoryDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          categoryId: category.id,
        })
      }
      onEmptyActionPress={() => router.push('/categories/create')}
      onRetryButtonPress={() => categoryList.dispatch({ type: 'FETCH' })}
      isRevalidating={categoryList.state.type === 'revalidating'}
      variant={match(categoryList.state)
        .returnType<CategoryListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ categories }) => ({
          type: categories.length > 0 ? 'loaded' : 'empty',
          categories,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteButtonDisabled={categoryDelete.state.type === 'deleting'}
      isDeleteModalOpen={match(categoryDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      onDeleteCancel={() =>
        categoryDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => categoryDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
