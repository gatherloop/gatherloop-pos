import { Spinner, YStack } from 'tamagui';
import { BudgetListItem, BudgetListItemProps } from './BudgetListItem';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';

export type BudgetListProps = {
  onRetryButtonPress: () => void;
  onEmptyActionPress?: () => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: BudgetListItemProps[] };
};

export const BudgetList = ({
  onRetryButtonPress,
  onEmptyActionPress,
  isRevalidating,
  variant,
}: BudgetListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Budget is Empty"
            subtitle="Please create a new budget"
            actionLabel="Create Budget"
            onActionPress={onEmptyActionPress}
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
