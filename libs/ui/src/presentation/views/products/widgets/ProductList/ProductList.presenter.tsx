import { match, P } from 'ts-pattern';
import { Product } from '../../../../../domain';
import { ProductListView, ProductListViewProps } from './ProductList.view';
import { useProductListController } from '../../../../controllers';
import { useFocusEffect } from '../../../../../utils';
import { useCallback } from 'react';

export type ProductListProps = {
  isSearchAutoFocus?: boolean;
  onItemPress?: (product: Product) => void;
  onDeleteMenuPress?: (product: Product) => void;
  onEditMenuPress?: (product: Product) => void;
};

export const ProductList = ({
  isSearchAutoFocus,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
}: ProductListProps) => {
  const { state, dispatch } = useProductListController();

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
    .returnType<ProductListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      ({ products }) => ({
        type: products.length > 0 ? 'loaded' : 'empty',
        items: products.map((product) => ({
          name: product.name,
          categoryName: product.category.name,
          price: product.price,
          onEditMenuPress: onEditMenuPress
            ? () => onEditMenuPress(product)
            : undefined,
          onDeleteMenuPress: onDeleteMenuPress
            ? () => onDeleteMenuPress(product)
            : undefined,
          onPress: onItemPress ? () => onItemPress(product) : undefined,
        })),
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <ProductListView
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
