import { EmptyView, ErrorView, LoadingView } from '../base';
import { YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { ExpenseListItem } from './ExpenseListItem';
import { Expense } from '../../../domain';

export type ExpenseListProps = {
  onRetryButtonPress: () => void;
  onEditMenuPress: (expense: Expense) => void;
  onDeleteMenuPress: (expense: Expense) => void;
  onItemPress: (expense: Expense) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'loaded'; items: Expense[] };
};

export const ExpenseList = ({
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  variant,
}: ExpenseListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {variant.type === 'loading' ? (
        <LoadingView title="Fetching Expenses..." />
      ) : variant.type === 'loaded' ? (
        variant.items.length > 0 ? (
          <FlatList
            nestedScrollEnabled
            data={variant.items}
            renderItem={({ item }) => (
              <ExpenseListItem
                budgetName={item.budget.name}
                createdAt={item.createdAt}
                total={item.total}
                walletName={item.wallet.name}
                onEditMenuPress={() => onEditMenuPress(item)}
                onDeleteMenuPress={() => onDeleteMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
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
          onRetryButtonPress={onRetryButtonPress}
        />
      )}
    </YStack>
  );
};
