import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { YStack } from 'tamagui';
import { useBudgetListState } from './BudgetList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Budget } from '../../../../../api-contract/src';
import { PercentSquare } from '@tamagui/lucide-icons';

export type BudgetListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (budget: Budget) => void;
    isShown?: (budget: Budget) => void;
  })[];
  onItemPress: (budget: Budget) => void;
};

export const BudgetList = ({ itemMenus, onItemPress }: BudgetListProps) => {
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
              onPress={() => onItemPress(budget)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(budget),
                isShown: () =>
                  itemMenu.isShown ? itemMenu.isShown(budget) : true,
              }))}
              footerItems={[
                { value: `${budget.percentage}%`, icon: PercentSquare },
              ]}
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
