import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useBudgetListState } from './BudgetList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PercentSquare } from '@tamagui/lucide-icons';

export const BudgetList = () => {
  const { budgets, refetch, status } = useBudgetListState();
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Budgets..." />
      ) : status === 'success' ? (
        budgets.length > 0 ? (
          budgets.map((budget) => (
            <ListItem
              key={budget.id}
              title={budget.name}
              subtitle={`Rp. ${budget.balance.toLocaleString('id')}`}
              thumbnailSrc="https://placehold.jp/120x120.png"
              footerItems={
                budget.id === 4
                  ? []
                  : [{ value: `${budget.percentage}%`, icon: PercentSquare }]
              }
            />
          ))
        ) : (
          <EmptyView
            title="Oops, Budget is Empty"
            subtitle="Please create a new budget"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Budgets"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
