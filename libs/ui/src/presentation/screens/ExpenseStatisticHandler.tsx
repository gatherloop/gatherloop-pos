import { match, P } from 'ts-pattern';
import { useExpenseStatisticListController } from '../controllers';
import {
  combineExpenseStatistics,
  ExpenseStatisticListUsecase,
  pivotExpenseStatistics,
} from '../../domain';
import {
  ExpenseStatisticScreen,
  ExpenseStatisticScreenProps,
} from './ExpenseStatisticScreen';

export type ExpenseStatisticHandlerProps = {
  expenseStatisticListUsecase: ExpenseStatisticListUsecase;
};

export const ExpenseStatisticHandler = ({
  expenseStatisticListUsecase,
}: ExpenseStatisticHandlerProps) => {
  const expenseStatisticList = useExpenseStatisticListController(
    expenseStatisticListUsecase
  );

  return (
    <ExpenseStatisticScreen
      onViewChange={(view) =>
        expenseStatisticList.dispatch({ type: 'SET_VIEW', view })
      }
      onGroupByChange={(groupBy) =>
        expenseStatisticList.dispatch({ type: 'SET_GROUP_BY', groupBy })
      }
      onRetryButtonPress={() =>
        expenseStatisticList.dispatch({ type: 'FETCH' })
      }
      onDateRangeChange={({ preset, startDate, endDate, groupBy }) =>
        expenseStatisticList.dispatch({
          type: 'SET_DATE_RANGE',
          preset,
          startDate,
          endDate,
          groupBy,
        })
      }
      variant={match(expenseStatisticList.state)
        .returnType<ExpenseStatisticScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      view={expenseStatisticList.state.view}
      budgetSeries={pivotExpenseStatistics(
        expenseStatisticList.state.expenseStatistics
      ).map((series) => ({
        budgetId: series.budgetId,
        budgetName: series.budgetName,
        points: series.points.map((point) => ({
          x: point.date,
          y: point.total,
        })),
      }))}
      combinedStatistics={combineExpenseStatistics(
        expenseStatisticList.state.expenseStatistics
      ).map((point) => ({ x: point.date, y: point.total }))}
      groupBy={expenseStatisticList.state.groupBy}
      preset={expenseStatisticList.state.preset}
      startDate={expenseStatisticList.state.startDate}
      endDate={expenseStatisticList.state.endDate}
    />
  );
};
