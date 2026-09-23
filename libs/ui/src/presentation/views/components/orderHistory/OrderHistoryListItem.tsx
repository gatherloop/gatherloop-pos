import dayjs from 'dayjs';
import { Text, XStack, XStackProps, YStack } from 'tamagui';
import {
  PaymentMethod,
  QrisPaymentStatus,
} from '../../../../domain/entities/Payment';
import { TransactionFulfillmentStatus } from '../../../../domain/entities/Transaction';
import { formatRupiah } from '../../../../utils/currency';

const fulfillmentPillByStatus: Record<
  TransactionFulfillmentStatus,
  { backgroundColor: string; color: string; label: string }
> = {
  preparing: {
    backgroundColor: '$orange5',
    color: '$orange11',
    label: 'Sedang disiapkan',
  },
  ready: {
    backgroundColor: '$green5',
    color: '$green11',
    label: 'Siap diambil',
  },
};

const StatusPill = ({
  backgroundColor,
  color,
  label,
}: {
  backgroundColor: string;
  color: string;
  label: string;
}) => (
  <XStack
    backgroundColor={backgroundColor}
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Text fontSize="$1" color={color}>
      {label}
    </Text>
  </XStack>
);

export type OrderHistoryListItemProps = {
  transactionNumber: number;
  status: QrisPaymentStatus;
  method: PaymentMethod;
  fulfillmentStatus: TransactionFulfillmentStatus;
  createdAt: string;
  tableLabel: string;
  customerName: string;
  itemCount: number;
  amount: number;
  onPress: () => void;
} & XStackProps;

export const OrderHistoryListItem = ({
  transactionNumber,
  status,
  method,
  fulfillmentStatus,
  createdAt,
  tableLabel,
  customerName,
  itemCount,
  amount,
  onPress,
  ...xStackProps
}: OrderHistoryListItemProps) => {
  const isAwaitingCashPayment = method === 'cash' && status === 'pending';
  return (
    <XStack
      gap="$3"
      padding="$3"
      borderRadius="$6"
      backgroundColor="$color2"
      alignItems="center"
      minHeight={44}
      onPress={onPress}
      cursor="pointer"
      accessibilityRole="button"
      accessibilityLabel={`Pesanan #${transactionNumber}`}
      {...xStackProps}
    >
      <YStack flex={1} gap="$1">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontWeight="bold" fontSize="$6">
            #{transactionNumber}
          </Text>
          {isAwaitingCashPayment ? (
            <StatusPill
              backgroundColor="$red5"
              color="$red11"
              label="Belum dibayar"
            />
          ) : (
            <StatusPill {...fulfillmentPillByStatus[fulfillmentStatus]} />
          )}
        </XStack>
        <Text color="$color10" fontSize="$2">
          {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
        </Text>
        <Text numberOfLines={1}>
          {tableLabel} · {customerName}
        </Text>
        <Text color="$color10">
          {itemCount} item · {formatRupiah(amount)}
        </Text>
      </YStack>
    </XStack>
  );
};
