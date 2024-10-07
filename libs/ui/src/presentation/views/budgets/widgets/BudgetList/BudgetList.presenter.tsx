import { match, P } from 'ts-pattern';
import { BudgetListView, BudgetListViewProps } from './BudgetList.view';
import { useBudgetListController } from '../../../../controllers';
import { useFocusEffect } from '../../../../../utils';
import { useCallback } from 'react';

export const BudgetList = () => {
  const { state, dispatch } = useBudgetListController();

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<BudgetListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ budgets }) => ({
      type: budgets.length > 0 ? 'loaded' : 'empty',
      items: budgets.map((budget) => ({
        name: budget.name,
        balance: budget.balance,
        id: budget.id,
        percentage: budget.percentage,
      })),
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return (
    <BudgetListView onRetryButtonPress={onRetryButtonPress} variant={variant} />
  );
};
