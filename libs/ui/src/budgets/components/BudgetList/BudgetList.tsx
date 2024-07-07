import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { XStack } from 'tamagui';
import { useBudgetListState } from './BudgetList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Budget } from '../../../../../api-contract/src';

export type BudgetListProps = {
  itemMenus: { title: string; onPress: (budget: Budget) => void }[];
  onItemPress: (budget: Budget) => void;
};

export const BudgetList = ({ itemMenus, onItemPress }: BudgetListProps) => {
  const { budgets, refetch, status } = useBudgetListState();
  return (
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Budgets..." />
      ) : status === 'success' ? (
        budgets.length > 0 ? (
          budgets.map((budget) => (
            <ListItem
              key={budget.id}
              title={budget.name}
              subtitle={`Rp. ${budget.balance.toLocaleString('id')}`}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
              onPress={() => onItemPress(budget)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(budget),
              }))}
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
    </XStack>
  );
};
