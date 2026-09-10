import {
  Calendar,
  ConciergeBell,
  DollarSign,
  MapPin,
  Pencil,
  Printer,
  Trash,
  Wallet,
  XCircle,
} from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { Paragraph, XStack, XStackProps, YStack } from 'tamagui';
import { Platform } from 'react-native';
import { PublicTable, TransactionSource } from '../../../../domain';

export type TransactionListItemProps = {
  name: string;
  source: TransactionSource;
  table?: PublicTable | null;
  orderNumber: number;
  total: number;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  onPayMenuPress: () => void;
  onUnpayMenuPress: () => void;
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

export const TransactionListItem = ({
  name,
  source,
  table,
  orderNumber,
  total,
  createdAt,
  paidAt,
  walletName,
  onPayMenuPress,
  onUnpayMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  ...xStackProps
}: TransactionListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={
        source === 'order' ? (
          <YStack gap="$1">
            <Paragraph textTransform="none" ellipse size="$6">
              Rp. {total.toLocaleString('id')}
            </Paragraph>
            <OrderBadge />
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
          label: 'ORDER NUMBER',
          value: orderNumber.toString(),
          isShown: orderNumber > 0,
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
