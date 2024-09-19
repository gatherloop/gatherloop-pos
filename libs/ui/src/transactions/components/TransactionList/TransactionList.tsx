import { EmptyView, ErrorView, LoadingView, Pagination } from '../../../base';
import { Input, YStack } from 'tamagui';
import { useTransactionListState } from './TransactionList.state';
import { FlatList } from 'react-native';
import { TransactionListItem } from '../TransactionListItem';

export const TransactionList = () => {
  const {
    transactions,
    refetch,
    status,
    searchValue,
    setSearhValue,
    emit,
    router,
    page,
    setPage,
    totalItem,
    itemPerPage,
  } = useTransactionListState();
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Transaction by Customer Name"
          value={searchValue}
          onChangeText={setSearhValue}
        />
      </YStack>
      {status === 'pending' ? (
        <LoadingView title="Fetching Transactions..." />
      ) : status === 'success' ? (
        transactions.length > 0 ? (
          <>
            <FlatList
              data={transactions}
              renderItem={({ item: transaction }) => (
                <TransactionListItem
                  name={transaction.name}
                  total={transaction.total}
                  createdAt={transaction.createdAt}
                  paidAt={transaction.paidAt}
                  walletName={transaction.wallet?.name}
                  onDeleteMenuPress={() =>
                    emit({
                      type: 'TransactionDeleteConfirmation',
                      transactionId: transaction.id,
                    })
                  }
                  onEditMenuPress={() =>
                    router.push(`/transactions/${transaction.id}`)
                  }
                  onPayMenuPress={() =>
                    emit({
                      type: 'TransactionPayConfirmation',
                      transactionId: transaction.id,
                    })
                  }
                  onPress={() => router.push(`/transactions/${transaction.id}`)}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={page}
              onChangePage={setPage}
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
