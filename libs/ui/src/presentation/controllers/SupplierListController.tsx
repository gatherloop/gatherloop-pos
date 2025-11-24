import { useCallback } from 'react';
import { SupplierListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';
import { match, P } from 'ts-pattern';
import { SupplierListProps } from '../components';

export const useSupplierListController = (usecase: SupplierListUsecase) => {
  const { state, dispatch } = useController(usecase);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onSearchValueChange = (query: string) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      query,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

  const onPageChange = (page: number) => {
    dispatch({ type: 'CHANGE_PARAMS', page });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<SupplierListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      ({ suppliers }) => ({
        type: suppliers.length > 0 ? 'loaded' : 'empty',
        items: suppliers,
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    searchValue: state.query,
    currentPage: state.page,
    totalItem: state.totalItem,
    itemPerPage: state.itemPerPage,
    onSearchValueChange,
    onPageChange,
    onRetryButtonPress,
    variant,
  };
};
