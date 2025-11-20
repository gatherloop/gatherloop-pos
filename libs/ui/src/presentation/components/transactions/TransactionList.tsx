import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import {
  Button,
  Input,
  Paragraph,
  Popover,
  RadioGroup,
  Separator,
  XStack,
  YStack,
} from 'tamagui';
import { FlatList } from 'react-native';
import { TransactionListItem } from './TransactionListItem';
import { PaymentStatus, Transaction, Wallet } from '../../../domain';
import { Label } from 'tamagui';
import { Filter } from '@tamagui/lucide-icons';

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
  onUnpayMenuPress: (transaction: Transaction) => void;
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
  onUnpayMenuPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  wallets,
  walletId,
  onWalletIdChange,
}: TransactionListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" justifyContent="space-between" alignItems="center">
        <Input
          id="search"
          placeholder="Search Customer Name"
          value={searchValue}
          onChangeText={onSearchValueChange}
          flex={1}
        />

        <Popover size="$5" allowFlip stayInFrame offset={15}>
          <Popover.Trigger asChild>
            <Button icon={Filter}>Filter</Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            width={300}
            height={200}
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            elevate
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

            <YStack gap="$3">
              <YStack>
                <Paragraph>Wallet</Paragraph>

                <RadioGroup
                  value={walletId === null ? 'all' : walletId.toString()}
                  onValueChange={(value) =>
                    onWalletIdChange(value === 'all' ? null : parseInt(value))
                  }
                >
                  <XStack gap="$3">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-wallet">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>

                      <Label htmlFor="all-wallet">All</Label>
                    </XStack>

                    {wallets.map((wallet) => (
                      <XStack gap="$2" alignItems="center">
                        <RadioGroup.Item
                          value={wallet.id.toString()}
                          id={wallet.id.toString()}
                        >
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        <Label htmlFor={wallet.id.toString()}>
                          {wallet.name}
                        </Label>
                      </XStack>
                    ))}
                  </XStack>
                </RadioGroup>
              </YStack>

              <Separator />

              <YStack>
                <Paragraph>Payment Status</Paragraph>
                <RadioGroup
                  value={paymentStatus}
                  onValueChange={(value) =>
                    onPaymentStatusChange(value as PaymentStatus)
                  }
                  gap="$2"
                >
                  <XStack gap="$3">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-payment-status">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="all-payment-status">All</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="paid" id="paid">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="paid">Paid</Label>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="unpaid" id="unpaid">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label htmlFor="unpaid">Unpaid</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>
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
                  onUnpayMenuPress={() => onUnpayMenuPress(item)}
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
