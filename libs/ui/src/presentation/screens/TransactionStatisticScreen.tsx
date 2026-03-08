import { H4 } from 'tamagui';
import { TransactionStatistic, Layout } from '../components';

export type TransactionStatisticScreenProps = {
  onLogoutPress: () => void;
  onGroupByChange: (groupBy: 'date' | 'month') => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  totalStatistics: { x: string; y: number }[];
  totalIncomeStatistics: { x: string; y: number }[];
  groupBy: 'date' | 'month';
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
        variant={props.variant}
        totalStatistics={props.totalStatistics}
        totalIncomeStatistics={props.totalIncomeStatistics}
        groupBy={props.groupBy}
      />
    </Layout>
  );
};
