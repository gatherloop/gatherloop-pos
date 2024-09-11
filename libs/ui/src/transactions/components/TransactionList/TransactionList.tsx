import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { Input, YStack } from 'tamagui';
import { useTransactionListState } from './TransactionList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Transaction } from '../../../../../api-contract/src';
import { Calendar, Clock, DollarSign, Wallet } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { FlatList } from 'react-native';

export type TransactionListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (transaction: Transaction) => void;
    isShown?: (transaction: Transaction) => void;
  })[];
  onItemPress: (transaction: Transaction) => void;
};

export const TransactionList = ({
  itemMenus,
  onItemPress,
}: TransactionListProps) => {
  const {
    transactions,
    refetch,
    status,
    searchInputValue,
    setSearchInputValue,
  } = useTransactionListState();
  return (
    <YStack gap="$3">
      <Input
        placeholder="Search Transaction by Customer Name"
        value={searchInputValue}
        onChangeText={setSearchInputValue}
      />
      {status === 'pending' ? (
        <LoadingView title="Fetching Transactions..." />
      ) : status === 'success' ? (
        transactions.length > 0 ? (
          <FlatList
          nestedScrollEnabled
            data={transactions}
            renderItem={({ item: transaction }) => (
              <ListItem
                title={transaction.name}
                subtitle={`Rp. ${transaction.total.toLocaleString('id')}`}
                backgroundColor={transaction.paidAt ? '$gray1' : '$red3'}
                onPress={() => onItemPress(transaction)}
                menus={itemMenus.map((itemMenu) => ({
                  ...itemMenu,
                  onPress: () => itemMenu.onPress(transaction),
                  isShown: () =>
                    itemMenu.isShown ? itemMenu.isShown(transaction) : true,
                }))}
                footerItems={[
                  {
                    icon: Calendar,
                    value: dayjs(transaction.createdAt).format('DD/MM/YYYY'),
                  },
                  {
                    icon: Clock,
                    value: dayjs(transaction.createdAt).format('HH:mm'),
                  },
                  {
                    icon: DollarSign,
                    value: transaction.paidAt ? 'Paid' : 'Unpaid',
                    isShown: () => typeof transaction.paidAt === 'string',
                  },
                  {
                    icon: Wallet,
                    value: transaction.wallet?.name ?? '',
                    isShown: () => typeof transaction.wallet?.name === 'string',
                  },
                ]}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ) : (
          <EmptyView
            title="Oops, Transaction is Empty"
            subtitle="Please create a new transaction"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Transactions"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
