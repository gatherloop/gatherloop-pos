import {
  Calendar,
  ConciergeBell,
  DollarSign,
  Pencil,
  Printer,
  Trash,
  Wallet,
  XCircle,
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
  onUnpayMenuPress: () => void;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
  onPrintInvoiceMenuPress: () => void;
  onPrintKitchenSlipMenuPress: () => void;
  onPrintBarSlipMenuPress: () => void;
  isPrintKitchenSlipMenuShown?: boolean;
  isPrintBarSlipMenuShown?: boolean;
} & XStackProps;

export const TransactionListItem = ({
  name,
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
  onPrintKitchenSlipMenuPress,
  onPrintBarSlipMenuPress,
  isPrintKitchenSlipMenuShown = true,
  isPrintBarSlipMenuShown = true,
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
          title: 'Print Kitchen Slip',
          icon: Printer,
          onPress: onPrintKitchenSlipMenuPress,
          isShown: Platform.OS === 'web' && isPrintKitchenSlipMenuShown,
        },
        {
          title: 'Print Bar Slip',
          icon: Printer,
          onPress: onPrintBarSlipMenuPress,
          isShown: Platform.OS === 'web' && isPrintBarSlipMenuShown,
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
