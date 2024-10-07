import { YStack } from 'tamagui';
import { BudgetListItem, BudgetListItemProps } from '../../components';
import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';

export type BudgetListViewProps = {
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: BudgetListItemProps[] };
};

export const BudgetListView = ({
  onRetryButtonPress,
  variant,
}: BudgetListViewProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Budgets..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Budget is Empty"
            subtitle="Please create a new product"
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => <BudgetListItem {...item} />}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Budgets"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
