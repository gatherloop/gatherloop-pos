import { H4, YStack } from 'tamagui';
import {
  TransactionStatistic,
  TransactionStatisticDateRangeChange,
} from '../components';
import { TransactionStatisticPreset } from '../../domain';

export type TransactionStatisticScreenProps = {
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
    <YStack gap="$3">
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
    </YStack>
  );
};
