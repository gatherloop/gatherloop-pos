import { H4 } from 'tamagui';
import {
  TransactionStatistic,
  TransactionStatisticDateRangeChange,
  Layout,
} from '../components';
import { TransactionStatisticPreset } from '../../domain';

export type TransactionStatisticScreenProps = {
  onLogoutPress: () => void;
  onGroupByChange: (groupBy: 'date' | 'month') => void;
  onRetryButtonPress: () => void;
  onDateRangeChange: (range: TransactionStatisticDateRangeChange) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  totalStatistics: { x: string; y: number }[];
  totalIncomeStatistics: { x: string; y: number }[];
  groupBy: 'date' | 'month';
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
};

export const TransactionStatisticScreen = (
  props: TransactionStatisticScreenProps
) => {
  return (
    <Layout onLogoutPress={props.onLogoutPress} title="Dashboard">
      <H4>Transaction Statistic</H4>
      <TransactionStatistic
        onGroupByChange={props.onGroupByChange}
        onRetryButtonPress={props.onRetryButtonPress}
        onDateRangeChange={props.onDateRangeChange}
        variant={props.variant}
        totalStatistics={props.totalStatistics}
        totalIncomeStatistics={props.totalIncomeStatistics}
        groupBy={props.groupBy}
        preset={props.preset}
        startDate={props.startDate}
        endDate={props.endDate}
      />
    </Layout>
  );
};
