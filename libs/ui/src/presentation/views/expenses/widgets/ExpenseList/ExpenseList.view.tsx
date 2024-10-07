import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { ExpenseListItem, ExpenseListItemProps } from '../../components';

export type ExpenseListViewProps = {
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'loaded'; items: ExpenseListItemProps[] };
};

export const ExpenseListView = ({
  onRetryButtonPress,
  variant,
}: ExpenseListViewProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {variant.type === 'loading' ? (
        <LoadingView title="Fetching Expenses..." />
      ) : variant.type === 'loaded' ? (
        variant.items.length > 0 ? (
          <FlatList
            nestedScrollEnabled
            data={variant.items}
            renderItem={({ item }) => <ExpenseListItem {...item} />}
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
