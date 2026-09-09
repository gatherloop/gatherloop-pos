import { match, P } from 'ts-pattern';
import { useTransactionStatisticList } from '../hooks';
import { TransactionStatisticListUsecase } from '../../../domain';
import {
  TransactionStatisticScreen,
  TransactionStatisticScreenProps,
} from '../../views/screens/pos/TransactionStatisticScreen';

export type TransactionStatisticHandlerProps = {
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
};

export const TransactionStatisticHandler = ({
  transactionStatisticListUsecase,
}: TransactionStatisticHandlerProps) => {
  const transactionStatisticList =
    useTransactionStatisticList(transactionStatisticListUsecase);

  return (
    <TransactionStatisticScreen
      onGroupByChange={(groupBy) =>
        transactionStatisticList.dispatch({ type: 'SET_GROUP_BY', groupBy })
      }
      onRetryButtonPress={() =>
        transactionStatisticList.dispatch({ type: 'FETCH' })
      }
      onDateRangeChange={({ preset, startDate, endDate, groupBy }) =>
        transactionStatisticList.dispatch({
          type: 'SET_DATE_RANGE',
          preset,
          startDate,
          endDate,
          groupBy,
        })
      }
      variant={match(transactionStatisticList.state)
        .returnType<TransactionStatisticScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      totalStatistics={transactionStatisticList.state.transactionStatistics.map(
        (statistic) => ({ y: statistic.total, x: statistic.date })
      )}
      totalIncomeStatistics={transactionStatisticList.state.transactionStatistics.map(
        (statistic) => ({ y: statistic.totalIncome, x: statistic.date })
      )}
      groupBy={transactionStatisticList.state.groupBy}
      preset={transactionStatisticList.state.preset}
      startDate={transactionStatisticList.state.startDate}
      endDate={transactionStatisticList.state.endDate}
    />
  );
};
