import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useExpenseListState } from './ExpenseList.state';
import { FlatList } from 'react-native';
import { ExpenseListItem } from '../ExpenseListItem';

export const ExpenseList = () => {
  const { expenses, refetch, status, onDeleteMenuPress, onEditMenuPress } =
    useExpenseListState();
  return (
    <YStack gap="$3" flex={1}>
      {status === 'pending' ? (
        <LoadingView title="Fetching Expenses..." />
      ) : status === 'success' ? (
        expenses.length > 0 ? (
          <FlatList
            nestedScrollEnabled
            data={expenses}
            renderItem={({ item: expense }) => (
              <ExpenseListItem
                budgetName={expense.budget.name}
                createdAt={expense.createdAt}
                walletName={expense.wallet.name}
                total={expense.total}
                onDeleteMenuPress={() => onDeleteMenuPress(expense)}
                onEditMenuPress={() => onEditMenuPress(expense)}
                onPress={() => onEditMenuPress(expense)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
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
