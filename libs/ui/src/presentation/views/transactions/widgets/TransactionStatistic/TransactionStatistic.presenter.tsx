// eslint-disable-next-line @nx/enforce-module-boundaries
import { match, P } from 'ts-pattern';
import { useTransactionStatisticListController } from '../../../../controllers';
import {
  TransactionStatisticView,
  TransactionStatisticViewProps,
} from './TransactionStatistic.view';

export const TransactionStatistic = () => {
  const { state, dispatch } = useTransactionStatisticListController();

  const onGroupByChange = (groupBy: 'date' | 'month') => {
    dispatch({ type: 'SET_GROUP_BY', groupBy });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<TransactionStatisticViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  const totalIncomeStatistics = state.transactionStatistics.map(
    (statistic) => ({
      y: statistic.totalIncome,
      x: statistic.date,
    })
  );

  const totalStatistics = state.transactionStatistics.map((statistic) => ({
    y: statistic.total,
    x: statistic.date,
  }));

  return (
    <TransactionStatisticView
      groupBy={state.groupBy}
      onGroupByChange={onGroupByChange}
      onRetryButtonPress={onRetryButtonPress}
      variant={variant}
      totalIncomeStatistics={totalIncomeStatistics}
      totalStatistics={totalStatistics}
    />
  );
};
