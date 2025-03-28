import {
  Calendar,
  Clock,
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
  total: number;
  createdAt: string;
  paidAt?: string;
  walletName?: string;
  onPayMenuPress: () => void;
  onEditMenuPress: () => void;
  onDeleteMenuPress: () => void;
  onPrintMenuPress: () => void;
} & XStackProps;

export const TransactionListItem = ({
  name,
  total,
  createdAt,
  paidAt,
  walletName,
  onPayMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onPrintMenuPress,
  ...xStackProps
}: TransactionListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${total.toLocaleString('id')}`}
      backgroundColor={paidAt ? '$gray1' : '$red3'}
      menus={[
        {
          title: 'Pay',
          icon: DollarSign,
          onPress: onPayMenuPress,
          isShown: paidAt === undefined,
        },
        {
          title: 'Print',
          icon: Printer,
          onPress: onPrintMenuPress,
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
          value: dayjs(createdAt).format('DD/MM/YYYY'),
        },
        {
          icon: Clock,
          value: dayjs(createdAt).format('HH:mm'),
        },
        {
          icon: DollarSign,
          value: paidAt ? 'Paid' : 'Unpaid',
          isShown: typeof paidAt === 'string',
        },
        {
          icon: Wallet,
          value: walletName ?? '',
          isShown: typeof walletName === 'string',
        },
      ]}
      {...xStackProps}
    />
  );
};
