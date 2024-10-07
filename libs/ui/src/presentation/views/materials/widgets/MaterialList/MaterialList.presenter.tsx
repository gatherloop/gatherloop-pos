import { match, P } from 'ts-pattern';
import { Material } from '../../../../../domain';
import { MaterialListView, MaterialListViewProps } from './MaterialList.view';
import { useMaterialListController } from '../../../../controllers';
import { useFocusEffect } from '../../../../../utils';
import { useCallback } from 'react';

export type MaterialListProps = {
  isSearchAutoFocus?: boolean;
  onItemPress?: (material: Material) => void;
  onDeleteMenuPress?: (material: Material) => void;
  onEditMenuPress?: (material: Material) => void;
};

export const MaterialList = ({
  isSearchAutoFocus,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
}: MaterialListProps) => {
  const { state, dispatch } = useMaterialListController();

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
    .returnType<MaterialListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      ({ materials }) => ({
        type: materials.length > 0 ? 'loaded' : 'empty',
        items: materials.map((material) => ({
          name: material.name,
          price: material.price,
          unit: material.unit,
          onEditMenuPress: onEditMenuPress
            ? () => onEditMenuPress(material)
            : undefined,
          onDeleteMenuPress: onDeleteMenuPress
            ? () => onDeleteMenuPress(material)
            : undefined,
          onPress: onItemPress ? () => onItemPress(material) : undefined,
        })),
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <MaterialListView
      currentPage={state.page}
      isSearchAutoFocus={isSearchAutoFocus ?? false}
      itemPerPage={state.itemPerPage}
      totalItem={state.totalItem}
      onPageChange={onPageChange}
      onRetryButtonPress={onRetryButtonPress}
      onSearchValueChange={onSearchValueChange}
      searchValue={state.query}
      variant={variant}
    />
  );
};
