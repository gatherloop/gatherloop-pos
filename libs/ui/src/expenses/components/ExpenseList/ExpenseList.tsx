import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useExpenseListState } from './ExpenseList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense } from '../../../../../api-contract/src';

export type ExpenseListProps = {
  itemMenus: { title: string; onPress: (expense: Expense) => void }[];
  onItemPress: (expense: Expense) => void;
};

export const ExpenseList = ({ itemMenus, onItemPress }: ExpenseListProps) => {
  const { expenses, refetch, status } = useExpenseListState();
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Expenses..." />
      ) : status === 'success' ? (
        expenses.length > 0 ? (
          expenses.map((expense) => (
            <ListItem
              key={expense.id}
              title={expense.createdAt}
              subtitle={`Rp. ${expense.total.toLocaleString('id')}`}
              onPress={() => onItemPress(expense)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(expense),
              }))}
            />
          ))
        ) : (
          <EmptyView
            title="Oops, Expense is Empty"
            subtitle="Please create a new expense"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Expenses"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
