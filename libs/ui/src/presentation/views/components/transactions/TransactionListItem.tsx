import {
  Calendar,
  CheckCircle,
  ConciergeBell,
  DollarSign,
  MapPin,
  Pencil,
  Printer,
  RotateCcw,
  ShoppingBag,
  Trash,
  Wallet,
  XCircle,
} from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { Paragraph, SizableText, XStack, XStackProps, YStack } from 'tamagui';
import { Platform } from 'react-native';
import {
  PaymentMethod,
  PublicTable,
  TransactionDiningOption,
  TransactionSource,
} from '../../../../domain';

export type TransactionListItemProps = {
  name: string;
  source: TransactionSource;
  diningOption: TransactionDiningOption;
  paymentMethod?: PaymentMethod | null;
  table?: PublicTable | null;
  pagerNumber: number;
  transactionNumber: number;
  total: number;
  createdAt: string;
  paidAt?: string;
  completedAt?: string | null;
  walletName?: string;
  onPayMenuPress: () => void;
  onUnpayMenuPress: () => void;
  onCompleteMenuPress: () => void;
  onUncompleteMenuPress: () => void;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
  onPrintInvoiceMenuPress: () => void;
  onPrintOrderSlipMenuPress: () => void;
} & XStackProps;

const OrderBadge = () => (
  <XStack
    backgroundColor="$blue5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$blue11">
      Order
    </Paragraph>
  </XStack>
);

const CashAwaitingPaymentBadge = () => (
  <XStack
    backgroundColor="$yellow5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$yellow11">
      Cash · awaiting payment
    </Paragraph>
  </XStack>
);

const TakeawayBadge = () => (
  <XStack
    backgroundColor="$purple5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
    alignItems="center"
    gap="$1"
  >
    <ShoppingBag size={12} color="$purple11" />
    <Paragraph size="$1" color="$purple11">
      Takeaway
    </Paragraph>
  </XStack>
);

const fulfillmentBadgeByStatus = {
  preparing: {
    backgroundColor: '$orange5',
    color: '$orange11',
    label: 'Preparing',
  },
  ready: { backgroundColor: '$green5', color: '$green11', label: 'Ready' },
} as const;

const FulfillmentBadge = ({ completedAt }: { completedAt?: string | null }) => {
  const { backgroundColor, color, label } =
    fulfillmentBadgeByStatus[completedAt ? 'ready' : 'preparing'];

  return (
    <XStack
      backgroundColor={backgroundColor}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$10"
      alignSelf="flex-start"
    >
      <Paragraph size="$1" color={color}>
        {label}
      </Paragraph>
    </XStack>
  );
};

const transactionNumberFontSizeByDigitCount: Record<number, string> = {
  1: '$9',
  2: '$8',
  3: '$7',
  4: '$6',
};

const TransactionNumberBadge = ({ value }: { value: number }) => {
  const digitCount = value.toString().length;
  const fontSize =
    transactionNumberFontSizeByDigitCount[digitCount] ??
    transactionNumberFontSizeByDigitCount[4];

  return (
    <YStack
      width={60}
      height={60}
      borderRadius="$5"
      backgroundColor="$color5"
      justifyContent="center"
      alignItems="center"
    >
      <SizableText color="$color12" fontSize={fontSize} fontWeight="bold">
        #{value}
      </SizableText>
    </YStack>
  );
};

export const TransactionListItem = ({
  name,
  source,
  diningOption,
  paymentMethod,
  table,
  pagerNumber,
  transactionNumber,
  total,
  createdAt,
  paidAt,
  completedAt,
  walletName,
  onPayMenuPress,
  onUnpayMenuPress,
  onCompleteMenuPress,
  onUncompleteMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  ...xStackProps
}: TransactionListItemProps) => {
  return (
    <ListItem
      title={name}
      leading={<TransactionNumberBadge value={transactionNumber} />}
      subtitle={
        source === 'order' || diningOption === 'takeaway' ? (
          <YStack gap="$1">
            <Paragraph textTransform="none" ellipse size="$6">
              Rp. {total.toLocaleString('id')}
            </Paragraph>
            <XStack gap="$2" flexWrap="wrap">
              {source === 'order' && (
                <>
                  <OrderBadge />
                  <FulfillmentBadge completedAt={completedAt} />
                  {paymentMethod === 'cash' && paidAt === undefined && (
                    <CashAwaitingPaymentBadge />
                  )}
                </>
              )}
              {diningOption === 'takeaway' && <TakeawayBadge />}
            </XStack>
          </YStack>
        ) : (
          `Rp. ${total.toLocaleString('id')}`
        )
      }
      backgroundColor="$background"
      theme={paidAt ? 'gray' : 'red'}
      menus={[
        {
          title: 'Pay',
          icon: DollarSign,
          onPress: onPayMenuPress,
          isShown: paidAt === undefined,
        },
        {
          title: 'Unpay',
          icon: XCircle,
          onPress: onUnpayMenuPress,
          isShown:
            paidAt !== undefined && dayjs().diff(createdAt, 'hour') <= 24,
        },
        {
          title: 'Print Invoice',
          icon: Printer,
          onPress: onPrintInvoiceMenuPress,
          isShown: Platform.OS === 'web',
        },
        {
          title: 'Print Order Slip',
          icon: Printer,
          onPress: onPrintOrderSlipMenuPress,
          isShown: Platform.OS === 'web',
        },
        {
          title: 'Mark as Ready',
          icon: CheckCircle,
          onPress: onCompleteMenuPress,
          isShown: source === 'order' && !completedAt,
        },
        {
          title: 'Mark as Preparing',
          icon: RotateCcw,
          onPress: onUncompleteMenuPress,
          isShown: source === 'order' && !!completedAt,
        },
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: paidAt === undefined,
        },
        {
          title: 'Delete',
          icon: Trash,
          onPress: onDeleteMenuPress,
          isShown: paidAt === undefined,
        },
      ]}
      footerItems={[
        {
          icon: Calendar,
          label: 'TRANSACTION DATE',
          value: dayjs(createdAt).format('DD/MM/YYYY - HH:mm'),
        },
        {
          icon: DollarSign,
          label: 'PAYMENT DATE',
          value: dayjs(paidAt).format('DD/MM/YYYY - HH:mm'),
          isShown: typeof paidAt === 'string',
        },
        {
          icon: Wallet,
          label: 'WALLET',
          value: walletName ?? '',
          isShown: typeof walletName === 'string',
        },
        {
          icon: ConciergeBell,
          label: 'PAGER NUMBER',
          value: pagerNumber.toString(),
          isShown: pagerNumber > 0,
        },
        {
          icon: MapPin,
          label: 'TABLE',
          value: table?.label ?? '',
          isShown: table != null,
        },
      ]}
      {...xStackProps}
    />
  );
};
