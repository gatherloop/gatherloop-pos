import { match, P } from 'ts-pattern';
import { TransactionStatisticListUsecase } from '../../domain';
import { useController } from './controller';
import { TransactionStatisticProps } from '../components';

export const useTransactionStatisticListController = (
  usecase: TransactionStatisticListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const onGroupByChange = (groupBy: 'date' | 'month') => {
    dispatch({ type: 'SET_GROUP_BY', groupBy });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<TransactionStatisticProps['variant']>()
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

  return {
    state,
    dispatch,
    onGroupByChange,
    onRetryButtonPress,
    variant,
    totalIncomeStatistics,
    totalStatistics,
    groupBy: state.groupBy,
  };
};
