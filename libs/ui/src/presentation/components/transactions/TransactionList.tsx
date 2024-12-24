import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { Input, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { TransactionListItem } from './TransactionListItem';
import { Transaction } from '../../../domain';

export type TransactionListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  transactions: Transaction[];
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  onRetryButtonPress: () => void;
  onEditMenuPress: (transaction: Transaction) => void;
  onDeleteMenuPress: (transaction: Transaction) => void;
  onPayMenuPress: (transaction: Transaction) => void;
  onPrintMenuPress: (transaction: Transaction) => void;
  onItemPress: (transaction: Transaction) => void;
};

export const TransactionList = ({
  searchValue,
  onSearchValueChange,
  variant,
  transactions,
  itemPerPage,
  onPageChange,
  currentPage,
  totalItem,
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  onPayMenuPress,
  onPrintMenuPress,
}: TransactionListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Transaction by Customer Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
        />
      </YStack>
      {variant.type === 'loading' ? (
        <LoadingView title="Fetching Transactions..." />
      ) : variant.type === 'loaded' ? (
        transactions.length > 0 ? (
          <>
            <FlatList
              data={transactions}
              renderItem={({ item }) => (
                <TransactionListItem
                  createdAt={item.createdAt}
                  name={item.name}
                  total={item.total}
                  paidAt={item.paidAt}
                  walletName={item.wallet?.name}
                  onEditMenuPress={() => onEditMenuPress(item)}
                  onDeleteMenuPress={() => onDeleteMenuPress(item)}
                  onPayMenuPress={() => onPayMenuPress(item)}
                  onPrintMenuPress={() => onPrintMenuPress(item)}
                  onPress={() => onItemPress(item)}
                />
              )}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={currentPage}
              onChangePage={onPageChange}
              totalItem={totalItem}
              itemPerPage={itemPerPage}
            />
          </>
        ) : (
          <EmptyView
            title="Oops, Transaction is Empty"
            subtitle="Please create a new transaction"
          />
        )
      ) : variant.type === 'error' ? (
        <ErrorView
          title="Failed to Fetch Transactions"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      ) : null}
    </YStack>
  );
};
