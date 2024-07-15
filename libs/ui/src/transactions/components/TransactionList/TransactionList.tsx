import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useTransactionListState } from './TransactionList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Transaction } from '../../../../../api-contract/src';

export type TransactionListProps = {
  itemMenus: {
    title: string;
    onPress: (transaction: Transaction) => void;
    isShown?: (transaction: Transaction) => boolean;
  }[];
  onItemPress: (transaction: Transaction) => void;
};

export const TransactionList = ({
  itemMenus,
  onItemPress,
}: TransactionListProps) => {
  const { transactions, refetch, status } = useTransactionListState();
  return (
    <YStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Transactions..." />
      ) : status === 'success' ? (
        transactions.length > 0 ? (
          transactions.map((transaction) => (
            <ListItem
              key={transaction.id}
              title={transaction.name}
              subtitle={`Rp. ${transaction.total.toLocaleString('id')}`}
              onPress={() => onItemPress(transaction)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(transaction),
                isShown: () =>
                  itemMenu.isShown ? itemMenu.isShown(transaction) : true,
              }))}
            />
          ))
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
