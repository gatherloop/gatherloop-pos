import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import { Input, Paragraph, ToggleGroup, XStack, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { TransactionListItem } from './TransactionListItem';
import { PaymentStatus, Transaction, Wallet } from '../../../domain';
import { Label } from 'tamagui';

export type TransactionListProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (paymentStatus: PaymentStatus) => void;
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
  onPrintInvoiceMenuPress: (transaction: Transaction) => void;
  onPrintOrderSlipMenuPress: (transaction: Transaction) => void;
  onItemPress: (transaction: Transaction) => void;
  wallets: Wallet[];
  walletId: number | null;
  onWalletIdChange: (walletId: number | null) => void;
};

export const TransactionList = ({
  searchValue,
  onSearchValueChange,
  paymentStatus,
  onPaymentStatusChange,
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
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  wallets,
  walletId,
  onWalletIdChange,
}: TransactionListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
        <Input
          placeholder="Search Transaction by Customer Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          flex={1}
        />
        <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
          <Label paddingRight="$0">Wallet</Label>
          <ToggleGroup
            orientation="horizontal"
            disableDeactivation
            type="single"
            value={walletId === null ? 'all' : walletId.toString()}
            onValueChange={(value) =>
              onWalletIdChange(value === 'all' ? null : parseInt(value))
            }
          >
            <ToggleGroup.Item value="all" aria-label="all">
              <Paragraph>All</Paragraph>
            </ToggleGroup.Item>
            {wallets.map((wallet) => (
              <ToggleGroup.Item
                value={wallet.id.toString()}
                aria-label={wallet.name}
              >
                <Paragraph>{wallet.name}</Paragraph>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </XStack>
        <XStack gap="$3" $xs={{ flexDirection: 'column' }}>
          <Label paddingRight="$0">Payment Status</Label>
          <ToggleGroup
            orientation="horizontal"
            disableDeactivation
            type="single"
            value={paymentStatus}
            onValueChange={onPaymentStatusChange}
          >
            <ToggleGroup.Item value="all" aria-label="all">
              <Paragraph>All</Paragraph>
            </ToggleGroup.Item>
            <ToggleGroup.Item value="paid" aria-label="paid">
              <Paragraph>Paid</Paragraph>
            </ToggleGroup.Item>
            <ToggleGroup.Item value="unpaid" aria-label="unpaid">
              <Paragraph>Unpaid</Paragraph>
            </ToggleGroup.Item>
          </ToggleGroup>
        </XStack>
      </XStack>
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
                  orderNumber={item.orderNumber}
                  total={item.total}
                  paidAt={item.paidAt ?? undefined}
                  walletName={item.wallet?.name}
                  onEditMenuPress={() => onEditMenuPress(item)}
                  onDeleteMenuPress={() => onDeleteMenuPress(item)}
                  onPayMenuPress={() => onPayMenuPress(item)}
                  onPrintInvoiceMenuPress={() => onPrintInvoiceMenuPress(item)}
                  onPrintOrderSlipMenuPress={() =>
                    onPrintOrderSlipMenuPress(item)
                  }
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
