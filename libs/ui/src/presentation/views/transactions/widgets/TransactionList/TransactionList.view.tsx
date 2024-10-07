import { EmptyView, ErrorView, LoadingView, Pagination } from '../../../base';
import { Input, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import {
  TransactionListItem,
  TransactionListItemProps,
} from '../../components';

export type TransactionListViewProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  transactionListItems: TransactionListItemProps[];
  page: number;
  onChangePage: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  onRetryButtonPress: () => void;
};

export const TransactionListView = ({
  searchValue,
  onSearchValueChange,
  variant,
  transactionListItems,
  itemPerPage,
  onChangePage,
  page,
  totalItem,
  onRetryButtonPress,
}: TransactionListViewProps) => {
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
        transactionListItems.length > 0 ? (
          <>
            <FlatList
              data={transactionListItems}
              renderItem={({ item }) => <TransactionListItem {...item} />}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={page}
              onChangePage={onChangePage}
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
