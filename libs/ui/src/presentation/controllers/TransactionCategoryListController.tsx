import { useCallback } from 'react';
import { TransactionCategoryListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';
import { match, P } from 'ts-pattern';
import { TransactionCategoryListProps } from '../components';

export const useTransactionCategoryListController = (
  usecase: TransactionCategoryListUsecase
) => {
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
    .returnType<TransactionCategoryListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({
      type: 'loading',
    }))
    .with(
      { type: P.union('loaded', 'revalidating') },
      ({ transactionCategories }) => ({
        type: transactionCategories.length > 0 ? 'loaded' : 'empty',
        transactionCategories,
      })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
