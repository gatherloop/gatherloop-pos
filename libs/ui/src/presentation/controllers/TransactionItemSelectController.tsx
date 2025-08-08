import { useCallback } from 'react';
import {
  OptionValue,
  Product,
  TransactionItemSelectUsecase,
} from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';
import { match, P } from 'ts-pattern';
import { TransactionItemSelectProps } from '../components';

export const useTransactionItemSelectController = (
  usecase: TransactionItemSelectUsecase
) => {
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

  const onSelectProduct = (product: Product) => {
    dispatch({ type: 'SELECT_PRODUCT', product });
  };

  const onUnselectProduct = () => {
    dispatch({ type: 'UNSELECT_PRODUCT' });
  };

  const onOptionValuesChange = (optionValues: OptionValue[]) => {
    dispatch({ type: 'UPDATE_OPTION_VALUES', optionValues });
  };

  const onSubmit = () => {
    dispatch({ type: 'FETCH_VARIANT' });
  };

  const variant = match(state)
    .returnType<TransactionItemSelectProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      ({ products }) => ({ type: products.length > 0 ? 'loaded' : 'empty' })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .with({ type: 'selectingOptions' }, () => ({ type: 'selectingOptions' }))
    .with({ type: 'loadingVariant' }, () => ({ type: 'submitting' }))
    .with({ type: 'loadingVariantSuccess' }, () => ({ type: 'submited' }))
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
    onSelectProduct,
    onUnselectProduct,
    onOptionValuesChange,
    onSubmit,
    products: state.products,
    selectedOptionValues: state.selectedOptionValues,
    selectedProduct: state.selectedProduct,
  };
};
