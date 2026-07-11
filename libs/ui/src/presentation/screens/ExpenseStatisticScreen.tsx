import { H4, YStack } from 'tamagui';
import {
  ExpenseStatistic,
  ExpenseStatisticDateRangeChange,
  ExpenseStatisticSeriesPoints,
  ExpenseVarianceList,
} from '../components';
import {
  ExpenseStatisticView,
  ExpenseVarianceRow,
  TransactionStatisticPreset,
} from '../../domain';

export type ExpenseStatisticScreenProps = {
  onViewChange: (view: ExpenseStatisticView) => void;
  onGroupByChange: (groupBy: 'date' | 'month') => void;
  onRetryButtonPress: () => void;
  onDateRangeChange: (range: ExpenseStatisticDateRangeChange) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  view: ExpenseStatisticView;
  budgetSeries: ExpenseStatisticSeriesPoints[];
  combinedStatistics: { x: string; y: number }[];
  groupBy: 'date' | 'month';
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
  varianceRows: ExpenseVarianceRow[];
  totalRevenue: number;
  totalExpense: number;
  unspentPercentage: number | null;
};

export const ExpenseStatisticScreen = (props: ExpenseStatisticScreenProps) => {
  return (
    <YStack gap="$3">
      <H4>Expense Statistic</H4>
      <ExpenseStatistic
        onViewChange={props.onViewChange}
        onGroupByChange={props.onGroupByChange}
        onRetryButtonPress={props.onRetryButtonPress}
        onDateRangeChange={props.onDateRangeChange}
        variant={props.variant}
        view={props.view}
        budgetSeries={props.budgetSeries}
        combinedStatistics={props.combinedStatistics}
        groupBy={props.groupBy}
        preset={props.preset}
        startDate={props.startDate}
        endDate={props.endDate}
      />
      {props.variant.type === 'loaded' ? (
        <ExpenseVarianceList
          rows={props.varianceRows}
          totalRevenue={props.totalRevenue}
          totalExpense={props.totalExpense}
          unspentPercentage={props.unspentPercentage}
        />
      ) : null}
    </YStack>
  );
};
