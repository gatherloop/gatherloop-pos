import {
  Calendar,
  ConciergeBell,
  DollarSign,
  Pencil,
  Printer,
  Trash,
  Wallet,
} from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';
import { Platform } from 'react-native';

export type TransactionListItemProps = {
  name: string;
  orderNumber: number;
  total: number;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  onPayMenuPress: () => void;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
  onPrintInvoiceMenuPress: () => void;
  onPrintOrderSlipMenuPress: () => void;
} & XStackProps;

export const TransactionListItem = ({
  name,
  orderNumber,
  total,
  createdAt,
  paidAt,
  walletName,
  onPayMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  ...xStackProps
}: TransactionListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${total.toLocaleString('id')}`}
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
          icon: ConciergeBell,
          label: 'ORDER NUMBER',
          value: orderNumber.toString(),
          isShown: orderNumber > 0,
        },
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
      ]}
      {...xStackProps}
    />
  );
};
