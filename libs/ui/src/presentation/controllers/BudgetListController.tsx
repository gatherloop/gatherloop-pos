import { useCallback } from 'react';
import { BudgetListUsecase } from '../../domain';
import { useFocusEffect } from '../../utils';
import { useController } from './controller';
import { BudgetListProps } from '../components/budgets';
import { match, P } from 'ts-pattern';

export const useBudgetListController = (usecase: BudgetListUsecase) => {
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
    .returnType<BudgetListProps['variant']>()
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

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
