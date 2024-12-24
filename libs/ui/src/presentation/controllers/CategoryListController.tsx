import { useCallback } from 'react';
import { CategoryListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';
import { match, P } from 'ts-pattern';
import { CategoryListProps } from '../components';

export const useCategoryListController = (usecase: CategoryListUsecase) => {
  const { state, dispatch } = useController(usecase);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<CategoryListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ categories }) => ({
      type: categories.length > 0 ? 'loaded' : 'empty',
      categories,
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
