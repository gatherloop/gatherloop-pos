import { match, P } from 'ts-pattern';
import {
  useBudgetListController,
  useExpenseStatisticListController,
  useTransactionStatisticListController,
} from '../controllers';
import {
  BudgetListUsecase,
  combineExpenseStatistics,
  computeExpenseVariance,
  ExpenseStatisticListUsecase,
  pivotExpenseStatistics,
  TransactionStatisticListUsecase,
} from '../../domain';
import {
  ExpenseStatisticScreen,
  ExpenseStatisticScreenProps,
} from './ExpenseStatisticScreen';

export type ExpenseStatisticHandlerProps = {
  expenseStatisticListUsecase: ExpenseStatisticListUsecase;
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
  budgetListUsecase: BudgetListUsecase;
};

export const ExpenseStatisticHandler = ({
  expenseStatisticListUsecase,
  transactionStatisticListUsecase,
  budgetListUsecase,
}: ExpenseStatisticHandlerProps) => {
  const expenseStatisticList = useExpenseStatisticListController(
    expenseStatisticListUsecase
  );
  // Revenue for the variance report; kept in lockstep with the expense date
  // range below rather than exposing its own date-range controls.
  const revenueStatisticList = useTransactionStatisticListController(
    transactionStatisticListUsecase
  );
  const budgetList = useBudgetListController(budgetListUsecase);

  const varianceReport = computeExpenseVariance(
    expenseStatisticList.state.expenseStatistics,
    revenueStatisticList.state.transactionStatistics,
    budgetList.state.budgets
  );

  return (
    <ExpenseStatisticScreen
      onViewChange={(view) =>
        expenseStatisticList.dispatch({ type: 'SET_VIEW', view })
      }
      onGroupByChange={(groupBy) => {
        expenseStatisticList.dispatch({ type: 'SET_GROUP_BY', groupBy });
        revenueStatisticList.dispatch({ type: 'SET_GROUP_BY', groupBy });
      }}
      onRetryButtonPress={() => {
        expenseStatisticList.dispatch({ type: 'FETCH' });
        revenueStatisticList.dispatch({ type: 'FETCH' });
        budgetList.dispatch({ type: 'FETCH' });
      }}
      onDateRangeChange={({ preset, startDate, endDate, groupBy }) => {
        expenseStatisticList.dispatch({
          type: 'SET_DATE_RANGE',
          preset,
          startDate,
          endDate,
          groupBy,
        });
        revenueStatisticList.dispatch({
          type: 'SET_DATE_RANGE',
          preset,
          startDate,
          endDate,
          groupBy,
        });
      }}
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
      varianceRows={varianceReport.rows}
      totalRevenue={varianceReport.totalRevenue}
      totalExpense={varianceReport.totalExpense}
      unspentPercentage={varianceReport.unspentPercentage}
    />
  );
};
