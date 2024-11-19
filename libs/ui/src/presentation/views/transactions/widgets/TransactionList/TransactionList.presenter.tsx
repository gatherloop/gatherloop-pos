import { match, P } from 'ts-pattern';
import { useTransactionListController } from '../../../../controllers';
import {
  TransactionListView,
  TransactionListViewProps,
} from './TransactionList.view';
import { Transaction } from '../../../../../domain';

export type TransactionListProps = {
  onDeleteMenuPress: (transaction: Transaction) => void;
  onEditMenuPress: (transaction: Transaction) => void;
  onPayMenuPress: (transaction: Transaction) => void;
  onPrintMenuPress: (transaction: Transaction) => void;
  onItemPress: (transaction: Transaction) => void;
};

export const TransactionList = ({
  onDeleteMenuPress,
  onEditMenuPress,
  onPayMenuPress,
  onItemPress,
  onPrintMenuPress,
}: TransactionListProps) => {
  const { state, dispatch } = useTransactionListController();

  const onSearchValueChange = (query: string) => {
    dispatch({
      type: 'CHANGE_PARAMS',
      query,
      page: 1,
      fetchDebounceDelay: 600,
    });
  };

  const onPageChange = (page: number) => {
    dispatch({ type: 'CHANGE_PARAMS', page });
  };

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<TransactionListViewProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with(
      { type: P.union('changingParams', 'loaded', 'revalidating') },
      () => ({ type: 'loaded' })
    )
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  const transactionListItems = state.transactions.map<
    TransactionListViewProps['transactionListItems'][number]
  >((transaction) => ({
    createdAt: transaction.createdAt,
    name: transaction.name,
    total: transaction.total,
    onDeleteMenuPress: () => onDeleteMenuPress(transaction),
    onEditMenuPress: () => onEditMenuPress(transaction),
    onPayMenuPress: () => onPayMenuPress(transaction),
    onPrintMenuPress: () => onPrintMenuPress(transaction),
    onPress: () => onItemPress(transaction),
    paidAt: transaction.paidAt,
    walletName: transaction.wallet?.name,
  }));

  return (
    <TransactionListView
      itemPerPage={state.itemPerPage}
      page={state.page}
      searchValue={state.query}
      totalItem={state.totalItem}
      onChangePage={onPageChange}
      onRetryButtonPress={onRetryButtonPress}
      onSearchValueChange={onSearchValueChange}
      transactionListItems={transactionListItems}
      variant={variant}
    />
  );
};
