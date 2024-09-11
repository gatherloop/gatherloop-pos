import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { YStack } from 'tamagui';
import { useExpenseListState } from './ExpenseList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Expense } from '../../../../../api-contract/src';
import dayjs from 'dayjs';
import { Calendar, Clock, Wallet } from '@tamagui/lucide-icons';
import { FlatList } from 'react-native';

export type ExpenseListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (expense: Expense) => void;
    isShown?: (expense: Expense) => void;
  })[];
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
          <FlatList
            nestedScrollEnabled
            data={expenses}
            renderItem={({ item: expense }) => (
              <ListItem
                title={expense.budget.name}
                subtitle={`Rp. ${expense.total.toLocaleString('id')}`}
                onPress={() => onItemPress(expense)}
                menus={itemMenus.map((itemMenu) => ({
                  ...itemMenu,
                  onPress: () => itemMenu.onPress(expense),
                  isShown: () =>
                    itemMenu.isShown ? itemMenu.isShown(expense) : true,
                }))}
                footerItems={[
                  {
                    icon: Calendar,
                    value: dayjs(expense.createdAt).format('DD/MM/YYYY'),
                  },
                  {
                    icon: Clock,
                    value: dayjs(expense.createdAt).format('HH:mm'),
                  },
                  {
                    icon: Wallet,
                    value: expense.wallet.name,
                  },
                ]}
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
